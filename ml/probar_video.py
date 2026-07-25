import cv2

cap = cv2.VideoCapture("../assets/videos/hola.mp4")

if not cap.isOpened():
    print("Error: no se pudo abrir el video")
else:
    contador_frames = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        contador_frames += 1

    fps = cap.get(cv2.CAP_PROP_FPS)

    print(f"Total de frames leídos: {contador_frames}")
    print(f"FPS del video: {fps}")

cap.release()