from channels.generic.websocket import AsyncJsonWebsocketConsumer

class MemberStatusConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.member_id = self.scope["url_route"]["kwargs"]["member_id"]
        self.group_name = f"member_{self.member_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def status_update(self, event):
        # event: { type: "status.update", status: "online"/"offline", ... }
        await self.send_json(event)
