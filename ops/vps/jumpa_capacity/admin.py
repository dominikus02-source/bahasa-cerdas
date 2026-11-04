"""Real staging-only LiveKit RoomService cleanup with a pluggable mock backend."""
import asyncio
from .cleanup import validate_qa_room

class LiveKitRoomAdmin:
    def __init__(self, endpoint, api_key, api_secret, backend=None):
        if not api_key.startswith("qa_") or not api_secret:
            raise ValueError("Dedicated QA staging credentials required")
        self.endpoint, self.api_key, self.api_secret = endpoint, api_key, api_secret
        self.backend = backend
    async def _with_client(self, fn):
        if self.backend is not None: return await fn(self.backend)
        from livekit import api
        async with api.LiveKitAPI(self.endpoint,self.api_key,self.api_secret) as client:
            return await fn(client)
    async def create_room(self, room, max_participants):
        validate_qa_room(room)
        if max_participants not in (20,50,100,150): raise ValueError("Invalid cap")
        async def op(client):
            if self.backend is not None:
                return await client.create_room(room,max_participants)
            from livekit import api
            return await client.room.create_room(api.CreateRoomRequest(name=room,max_participants=max_participants))
        return await self._with_client(op)
    async def participants(self, room):
        validate_qa_room(room)
        async def op(client):
            if self.backend is not None: return await client.participants(room)
            from livekit import api
            result=await client.room.list_participants(api.ListParticipantsRequest(room=room))
            return [p.identity for p in result.participants]
        return await self._with_client(op)
    async def room_exists(self, room):
        validate_qa_room(room)
        async def op(client):
            if self.backend is not None: return await client.room_exists(room)
            from livekit import api
            rooms=await client.room.list_rooms(api.ListRoomsRequest(names=[room]))
            return any(x.name==room for x in rooms.rooms)
        return await self._with_client(op)
    async def remove(self, room, identity):
        validate_qa_room(room)
        if not identity.startswith("qa-"):raise ValueError("Non-QA identity rejected")
        async def op(client):
            if self.backend is not None:return await client.remove(room,identity)
            from livekit import api
            return await client.room.remove_participant(api.RoomParticipantIdentity(room=room,identity=identity))
        return await self._with_client(op)
    async def delete(self, room):
        validate_qa_room(room)
        async def op(client):
            if self.backend is not None:return await client.delete(room)
            from livekit import api
            return await client.room.delete_room(api.DeleteRoomRequest(room=room))
        return await self._with_client(op)

class QACleanup:
    def __init__(self, admin):
        self.admin=admin
        self.owned=set()
    def own(self,room): self.owned.add(validate_qa_room(room))
    async def cleanup(self):
        errors=[]
        for room in sorted(self.owned):
            try:
                for identity in await self.admin.participants(room):
                    if not identity.startswith("qa-"):
                        raise RuntimeError("Non-QA participant in QA room; refuse selective cleanup")
                    await self.admin.remove(room,identity)
                await self.admin.delete(room)
                if await self.admin.room_exists(room):
                    raise RuntimeError("QA room still exists after deletion")
                self.owned.discard(room)
            except Exception as exc:
                errors.append(f"{room}: {type(exc).__name__}")
        if errors:raise RuntimeError("QA_CLEANUP_FAILED: "+";".join(errors))

if __name__=="__main__":
    import unittest
    from unittest.mock import AsyncMock
    from .cleanup import qa_room
    class Backend:
        def __init__(self):self.people=["qa-1","qa-2"]; self.deleted=[];self.removed=[]
        async def participants(self,room):return list(self.people)
        async def remove(self,room,identity):self.people.remove(identity);self.removed.append(identity)
        async def delete(self,room):self.deleted.append(room)
        async def room_exists(self,room):return room not in self.deleted
        async def create_room(self,room,cap):return cap
    class CleanupTests(unittest.IsolatedAsyncioTestCase):
        def make(self): 
            backend=Backend()
            admin=LiveKitRoomAdmin("https://staging.example.org","qa_key","secret",backend)
            return backend,admin,QACleanup(admin)
        async def test_cleanup_actual_calls(self):
            b,a,c=self.make();r=qa_room(20);c.own(r)
            await c.cleanup()
            self.assertEqual(b.removed,["qa-1","qa-2"])
            self.assertEqual(b.deleted,[r])
        async def test_refuse_production_room(self):
            b,a,c=self.make()
            with self.assertRaises(ValueError):c.own("room-production")
        async def test_refuse_nonqa_identity(self):
            b,a,c=self.make();b.people=["user-real"];c.own(qa_room(20))
            with self.assertRaisesRegex(RuntimeError,"QA_CLEANUP_FAILED"):await c.cleanup()
            self.assertEqual(b.deleted,[])
        async def test_cleanup_on_error_raises(self):
            b,a,c=self.make();r=qa_room(20);c.own(r)
            async def fail(room):raise RuntimeError("mock network")
            b.delete=fail
            with self.assertRaisesRegex(RuntimeError,"QA_CLEANUP_FAILED"):await c.cleanup()
            self.assertIn(r,c.owned)
        async def test_create_qa_only(self):
            b,a,c=self.make()
            self.assertEqual(await a.create_room(qa_room(50),50),50)
            with self.assertRaises(ValueError):await a.create_room("prod",50)
    unittest.main()
