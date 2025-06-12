import asyncio
import websockets
import json
from typing import Callable, Dict, Set, Any

class WebsocketServer:
    def __init__(self, host: str = "localhost", port: int = 8765):
        """Initialize the WebSocket server.
        
        Args:
            host (str): Host address to bind the server to
            port (int): Port number to listen on
        """
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.message_handlers: Dict[str, Callable] = {}
        self.server = None
        
        # Define async tasks
        self.async_tasks = [self.run_server]

    def add_message_handler(self, message_type: str, handler: Callable):
        """Add a message handler for a specific message type.
        
        Args:
            message_type (str): The type of message to handle
            handler (Callable): The function to handle the message
        """
        self.message_handlers[message_type] = handler

        print(f"Successfully added message handler for {message_type}")

    async def handle_client(self, websocket: websockets.WebSocketServerProtocol, path: str = ""):
        """Handle individual client connections.
        
        Args:
            websocket: The WebSocket connection
            path: The connection path
        """
        try:
            # Add the client to our set of connected clients
            self.clients.add(websocket)
            print(f"Client connected. Total clients: {len(self.clients)}")

            # Handle messages from the client
            async for message in websocket:
                try:
                    # Parse the JSON message
                    data = json.loads(message)
                    
                    # Check if we have a message type
                    if 'type' not in data:
                        await websocket.send(json.dumps({
                            'error': 'Message type not specified'
                        }))
                        continue

                    message_type = data['type']
                    
                    # Check if we have a handler for this message type
                    if message_type in self.message_handlers:
                        # Call the handler and get the response
                        response = await self.message_handlers[message_type](data)
                        if response:
                            await websocket.send(json.dumps(response))
                    else:
                        await websocket.send(json.dumps({
                            'error': f'Unknown message type: {message_type}'
                        }))

                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        'error': 'Invalid JSON message'
                    }))

        except websockets.exceptions.ConnectionClosed:
            print("Client connection closed unexpectedly")
        finally:
            # Remove the client from our set when they disconnect
            self.clients.remove(websocket)
            print(f"Client disconnected. Total clients: {len(self.clients)}")

    async def broadcast(self, message: Any):
        """Broadcast a message to all connected clients.
        
        Args:
            message: The message to broadcast (will be JSON encoded)
        """
        if self.clients:
            await asyncio.gather(
                *[client.send(json.dumps(message)) for client in self.clients]
            )

    async def run_server(self):
        """Async task to run the WebSocket server"""
        self.server = await websockets.serve(
            self.handle_client,
            self.host,
            self.port
        )
        print(f"WebSocket server started on ws://{self.host}:{self.port}")
        
        try:
            # Keep the server running
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            await self.stop()

    async def stop(self):
        """Stop the WebSocket server."""
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            print("WebSocket server stopped")

# Example usage:
if __name__ == "__main__":
    # Create a server instance
    server = WebsocketServer()

    # Example message handler
    async def handle_echo(message):
        return {'type': 'echo', 'data': message.get('data', '')}

    # Register the message handler
    server.add_message_handler('echo', handle_echo)

    # Run the server
    try:
        asyncio.run(server.run_server())
    except KeyboardInterrupt:
        print("\nShutting down server...")
