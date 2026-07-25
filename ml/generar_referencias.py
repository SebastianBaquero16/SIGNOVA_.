import os, json, math, cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

VIDEOS_DIR = "../assets/videos"
SALIDA_DIR = "../assets/referencias"
N_FRAMES_SECUENCIA = 10  # cuántos "momentos" del movimiento guardamos por seña
os.makedirs(SALIDA_DIR, exist_ok=True)

# (mcp, pip, dip) de cada dedo -> el ángulo se mide en la articulación central (pip)
DEDOS = {
    "pulgar":  (1, 2, 3),
    "indice":  (5, 6, 7),
    "medio":   (9, 10, 11),
    "anular":  (13, 14, 15),
    "menique": (17, 18, 19),
}


def crear_detector():
    opciones = mp_vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path="models/hand_landmarker.task"),
        running_mode=mp_vision.RunningMode.VIDEO,
        num_hands=2,
    )
    return mp_vision.HandLandmarker.create_from_options(opciones)


def normalizar(landmarks):
    # Origen en la muñeca (punto 0), escala por distancia muñeca -> nudillo medio (punto 9)
    base = landmarks[0]
    escala = ((landmarks[9].x - base.x) ** 2 + (landmarks[9].y - base.y) ** 2) ** 0.5 or 1e-6
    return [
        {"x": (p.x - base.x) / escala, "y": (p.y - base.y) / escala, "z": (p.z - base.z) / escala}
        for p in landmarks
    ]


def angulo_entre(a, b, c):
    """Ángulo (en radianes) en el punto b, formado por a-b-c."""
    v1 = (a["x"] - b["x"], a["y"] - b["y"], a["z"] - b["z"])
    v2 = (c["x"] - b["x"], c["y"] - b["y"], c["z"] - b["z"])
    n1 = math.sqrt(sum(x * x for x in v1)) or 1e-6
    n2 = math.sqrt(sum(x * x for x in v2)) or 1e-6
    cos_ang = sum(v1[i] * v2[i] for i in range(3)) / (n1 * n2)
    cos_ang = max(-1.0, min(1.0, cos_ang))
    return math.acos(cos_ang)


def calcular_angulos(landmarks_norm):
    """Ángulo de curvatura de cada dedo. Independiente de escala/traslación/rotación general."""
    return [
        angulo_entre(landmarks_norm[i], landmarks_norm[j], landmarks_norm[k])
        for (i, j, k) in DEDOS.values()
    ]


def muestrear_parejo(lista, n):
    """Toma n elementos distribuidos parejo a lo largo de la lista (conserva el orden temporal)."""
    if len(lista) <= n:
        return lista
    indices = [round(i * (len(lista) - 1) / (n - 1)) for i in range(n)]
    return [lista[i] for i in indices]


resumen = []

for archivo in sorted(os.listdir(VIDEOS_DIR)):
    if not archivo.lower().endswith(".mp4"):
        continue
    nombre_sena = os.path.splitext(archivo)[0]
    ruta = os.path.join(VIDEOS_DIR, archivo)
    detector = crear_detector()
    cap = cv2.VideoCapture(ruta)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frames_con_mano = []  # se mantienen EN ORDEN TEMPORAL, no se reordenan

    i = 0
    ultimo_ts = -1
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img_mp = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        ts = int((i / fps) * 1000)
        if ts <= ultimo_ts:
            ts = ultimo_ts + 1  # el timestamp debe ser estrictamente creciente
        ultimo_ts = ts
        resultado = detector.detect_for_video(img_mp, ts)
        if resultado.hand_landmarks:
            frames_con_mano.append((i, resultado.hand_landmarks[0]))
        i += 1
    cap.release()
    detector.close()
    total_frames = i

    if not frames_con_mano:
        print(f"[AVISO] {nombre_sena}: no se detectó mano en ningún frame ({total_frames} frames)")
        resumen.append({"sena": nombre_sena, "estado": "sin_deteccion", "frames": total_frames})
        continue

    # Muestreamos N momentos distribuidos a lo largo de TODO el movimiento (no solo el centro)
    muestras = muestrear_parejo(frames_con_mano, N_FRAMES_SECUENCIA)
    secuencia_ref = []
    for _, landmarks in muestras:
        lm_norm = normalizar(landmarks)
        secuencia_ref.append({"landmarks": lm_norm, "angulos": calcular_angulos(lm_norm)})

    with open(f"{SALIDA_DIR}/{nombre_sena}.json", "w") as f:
        json.dump({"frames": secuencia_ref}, f)

    cobertura = round(len(frames_con_mano) / total_frames * 100, 1)
    frames_usados = [idx for idx, _ in muestras]
    print(f"[OK] {nombre_sena} -> {len(secuencia_ref)} momentos (frames {frames_usados}, cobertura {cobertura}%)")
    resumen.append({"sena": nombre_sena, "estado": "ok", "frames_usados": frames_usados,
                     "total_frames": total_frames, "cobertura_pct": cobertura})

with open(f"{SALIDA_DIR}/_resumen.json", "w") as f:
    json.dump(resumen, f, indent=2, ensure_ascii=False)

print("\nListo. Referencias guardadas en", os.path.abspath(SALIDA_DIR))
