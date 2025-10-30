# Simple placeholder camera module for AI Interview Platform
import cv2
import threading
import base64


class SimpleVideoCamera:
    """
    Simple video camera class for handling webcam operations
    This is a placeholder implementation to allow the system to run
    """

    def __init__(self):
        self.camera = None
        self.thread = None
        self.frame = None
        self.last_access = None
        self.lock = threading.Lock()

    def __del__(self):
        if self.camera:
            self.camera.release()

    def get_frame(self):
        """
        Get a frame from the camera
        Returns a placeholder frame for now
        """
        try:
            if self.camera is None:
                self.camera = cv2.VideoCapture(0)

            success, frame = self.camera.read()
            if success:
                ret, jpeg = cv2.imencode(".jpg", frame)
                return jpeg.tobytes()
            else:
                # Return a placeholder if camera fails
                return b""
        except Exception as e:
            print(f"Camera error: {e}")
            return b""

    def start_recording(self):
        """Start recording - placeholder implementation"""
        pass

    def stop_recording(self):
        """Stop recording - placeholder implementation"""
        pass

    def capture_frame(self):
        """Capture a single frame - placeholder implementation"""
        return self.get_frame()
