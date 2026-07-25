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

        if contador_frames == 68:
            cv2.imwrite("frame_68.jpg", frame)
            print("Guardé el frame 68")

        if contador_frames == 143:
            cv2.imwrite("frame_143.jpg", frame)
            print("Guardé el frame 143")

        contador_frames += 1

cap.release()
print("Listo")