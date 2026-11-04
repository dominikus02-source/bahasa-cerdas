"""Deterministic QA room ownership and cleanup, including signals."""
import re
import signal
import time
import uuid
QA_PREFIX = "qa-capacity-"
def qa_room(stage):
    if stage not in (20, 50, 100, 150): raise ValueError("Invalid QA stage")
    return f"{QA_PREFIX}{stage}-{uuid.uuid4().hex[:12]}"
def validate_qa_room(room):
    if not re.fullmatch(r"qa-capacity-(20|50|100|150)-[a-f0-9]{12}", room or ""):
        raise ValueError("Only owned QA rooms can be deleted")
    return room
class RoomCleanup:
    def __init__(self, stop_egress, remove_participant, delete_room, list_participants):
        self.rooms = set()
        self.stop_egress = stop_egress
        self.remove_participant = remove_participant
        self.delete_room = delete_room
        self.list_participants = list_participants
        self.egresses = {}
    def own(self, room):
        self.rooms.add(validate_qa_room(room))
    def add_egress(self, room, egress_id):
        validate_qa_room(room)
        self.egresses.setdefault(room, set()).add(egress_id)
    def cleanup(self):
        errors = []
        for room in list(self.rooms):
            try:
                for egress in self.egresses.get(room, set()):
                    self.stop_egress(egress)
                for identity in self.list_participants(room):
                    self.remove_participant(room, identity)
                self.delete_room(room)
                if self.list_participants(room):
                    raise RuntimeError("Participants remain after cleanup")
                self.rooms.discard(room)
            except Exception as exc:
                errors.append(f"{room}: {type(exc).__name__}")
        if errors: raise RuntimeError("QA cleanup incomplete: " + "; ".join(errors))
def install_signal_stop(stop_flag):
    def handler(signum, frame):
        stop_flag["stop"] = True
    previous = {}
    for signum in (signal.SIGINT, signal.SIGTERM):
        previous[signum] = signal.getsignal(signum)
        signal.signal(signum, handler)
    return previous
if __name__ == "__main__":
    import unittest
    class CleanupTests(unittest.TestCase):
        def test_success(self):
            users = ["p1"]
            calls = []
            c = RoomCleanup(lambda e: calls.append(("stop",e)), lambda r,p: users.remove(p), lambda r: calls.append(("delete",r)), lambda r: list(users))
            room = qa_room(20); c.own(room); c.add_egress(room,"EG1"); c.cleanup()
            self.assertEqual(c.rooms, set()); self.assertEqual(calls[0],("stop","EG1"))
        def test_reject_nonqa(self):
            with self.assertRaises(ValueError): validate_qa_room("production-room")
        def test_cleanup_failure(self):
            c = RoomCleanup(lambda e:None, lambda r,p:None,lambda r:None,lambda r:["stuck"])
            c.own(qa_room(20))
            with self.assertRaises(RuntimeError): c.cleanup()
    unittest.main()
