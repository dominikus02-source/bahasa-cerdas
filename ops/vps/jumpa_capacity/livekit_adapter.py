"""LiveKit RTC adapter: actual join/publish/subscribe/reconnect/leave; no I/O at import.

SDK installation: pip install 'livekit>=1,<2'. No staging credentials or load
connections are used by unit tests. Do not use without staging gate approval.
"""
import asyncio
import contextlib
import time
from .cleanup import validate_qa_room
from .tokens import issue_token

class LiveKitParticipant:
    def __init__(self, url, key, secret, room_name, identity, role="passive", rtc_module=None):
        validate_qa_room(room_name)
        if not identity.startswith("qa-"): raise ValueError("QA identity required")
        self.url, self.key, self.secret = url, key, secret
        self.room_name, self.identity, self.role = room_name, identity, role
        self._rtc = rtc_module
        self.room = None
        self.join_latency_s = None
        self.subscriptions = 0
        self.reconnect_attempts = 0
        self.reconnect_success = 0
        self._tasks = []
        self._sources = []
        self._connection_events = []
    def _sdk(self):
        if self._rtc is None:
            from livekit import rtc
            self._rtc = rtc
        return self._rtc
    async def join(self):
        rtc = self._sdk()
        self.room = rtc.Room()
        self.room.on("track_subscribed", self._on_subscribed)
        self.room.on("reconnecting", lambda: self._connection_events.append("reconnecting"))
        self.room.on("reconnected", lambda: self._connection_events.append("reconnected"))
        token = issue_token(self.key, self.secret, self.room_name, self.identity, ttl_seconds=300)
        start = time.monotonic()
        await self.room.connect(self.url, token)
        self.join_latency_s = time.monotonic() - start
        return self
    def _on_subscribed(self, track, publication, participant):
        self.subscriptions += 1
    async def publish(self):
        """Publisher sends generated media, never touches a webcam or microphone."""
        if self.role == "passive": return
        if self.room is None: raise RuntimeError("Join required")
        rtc = self._sdk()
        source = rtc.AudioSource(48000, 1)
        track = rtc.LocalAudioTrack.create_audio_track("qa-audio", source)
        await self.room.local_participant.publish_track(
            track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE))
        self._sources.append(source)
        self._tasks.append(asyncio.create_task(self._audio_pump(source, rtc)))
        video_source = rtc.VideoSource(640, 360)
        video = rtc.LocalVideoTrack.create_video_track("qa-video", video_source)
        await self.room.local_participant.publish_track(
            video, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_CAMERA))
        self._sources.append(video_source)
        self._tasks.append(asyncio.create_task(self._video_pump(video_source, rtc)))
    async def _audio_pump(self, source, rtc):
        # 10 ms synthesized PCM samples at 48 kHz.
        silence = bytes(480*2)
        while True:
            frame = rtc.AudioFrame(data=silence, sample_rate=48000,
                                   num_channels=1, samples_per_channel=480)
            await source.capture_frame(frame)
            await asyncio.sleep(0.01)
    async def _video_pump(self, source, rtc):
        # I420 black frame 640x360; 10fps. This exercises encoder+SFU.
        frame = rtc.VideoFrame(640, 360, rtc.VideoBufferType.I420,
                               bytes(640*360*3//2))
        while True:
            source.capture_frame(frame)
            await asyncio.sleep(0.1)
    async def rtc_stats(self):
        if self.room is None: raise RuntimeError("Join required")
        return await self.room.get_rtc_stats()
    async def reconnect(self):
        """Deliberate reconnect with same identity and a fresh 5-minute token."""
        self.reconnect_attempts += 1
        if self.room is None: return False
        try:
            await self._stop_pumps()
            await self.room.disconnect()
            await self.join()
            if self.role != "passive": await self.publish()
            self.reconnect_success += 1
            return True
        except Exception:
            return False
    async def _stop_pumps(self):
        for task in self._tasks: task.cancel()
        if self._tasks: await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()
    async def leave(self):
        await self._stop_pumps()
        if self.room is not None:
            try: await self.room.disconnect()
            finally: self.room = None

async def join_many(participants, concurrency=5):
    semaphore = asyncio.Semaphore(concurrency)
    async def start(p):
        async with semaphore:
            await p.join()
            await p.publish()
    return await asyncio.gather(*(start(p) for p in participants),return_exceptions=True)

if __name__ == "__main__":
    import unittest
    from unittest.mock import AsyncMock
    from .cleanup import qa_room
    class FakeRoom:
        def __init__(self): self.events={}; self.connect=AsyncMock(); self.disconnect=AsyncMock()
        def on(self, event, callback): self.events[event]=callback
    class RTC:
        Room=FakeRoom
    class AdapterTests(unittest.IsolatedAsyncioTestCase):
        def make(self,role="passive"):
            return LiveKitParticipant("wss://stage.example.org","qa_key","secret",qa_room(20),"qa-001",role,RTC)
        async def test_join_leave(self):
            p=self.make()
            await p.join(); self.assertIsNotNone(p.join_latency_s)
            await p.leave(); self.assertIsNone(p.room)
        async def test_subscribe_event(self):
            p=self.make();await p.join()
            p.room.events["track_subscribed"](None,None,None)
            self.assertEqual(p.subscriptions,1)
            await p.leave()
        async def test_passive_no_publish(self):
            p=self.make();await p.join();await p.publish()
            self.assertEqual(len(p._tasks),0)
            await p.leave()
        async def test_reconnect(self):
            p=self.make();await p.join()
            self.assertTrue(await p.reconnect())
            self.assertEqual((p.reconnect_attempts,p.reconnect_success),(1,1))
            await p.leave()
        async def test_reject_non_qa(self):
            with self.assertRaises(ValueError):
                LiveKitParticipant("wss://stage.example.org","qa","secret",qa_room(20),"user-real")
    unittest.main()
