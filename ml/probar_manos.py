import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

# Crear el detector de manos a partir del modelo descargado
opciones = mp_vision.HandLandmarkerOptions(
    base_options=mp_python.BaseOptions(model_asset_path="models/hand_landmarker.task"),
    running_mode=mp_vision.RunningMode.VIDEO,
    num_hands=2,
)
detector = mp_vision.HandLandmarker.create_from_options(opciones)

cap = cv2.VideoCapture("../assets/videos/hola.mp4")

if not cap.isOpened():
    print("Error: no se pudo abrir el video")
else:
    fps = cap.get(cv2.CAP_PROP_FPS)
    contador_frames = 0
    frames_con_mano = 0
    frames_sin_mano = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # MediaPipe espera la imagen en formato RGB, y OpenCV la lee en BGR
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        imagen_mp = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

        timestamp_ms = int((contador_frames / fps) * 1000)
        resultado = detector.detect_for_video(imagen_mp, timestamp_ms)

        if resultado.hand_landmarks:
            frames_con_mano += 1
        else:
            frames_sin_mano.append(contador_frames)

        contador_frames += 1

    print(f"Total de frames: {contador_frames}")
    print(f"Frames donde se detectó al menos una mano: {frames_con_mano}")
    print(f"Porcentaje de cobertura: {frames_con_mano / contador_frames * 100:.1f}%")
    print(f"Frames SIN mano detectada: {frames_sin_mano}")

cap.release()