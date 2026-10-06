# Perlas: cómo añadir un vídeo o un GIF

Cada perla es una entrada de `perlas.json`. La app la muestra en **Inicio › Herramientas › Perlas**.

## Preparar el vídeo

- Corto: 15–60 segundos, una sola idea por vídeo.
- Formato **MP4 (H.264)**, 720p y menos de 15 MB. Un MP4 pesa mucho menos que un GIF de la misma duración.
- Grabado en vertical si se va a ver en el móvil.
- **Sin caras, nombres, etiquetas ni pantallas con datos de pacientes.** La web es pública.
- Si quieres, una imagen de portada (`.jpg`) del mismo nombre.

## Subirlo

1. En GitHub, entra en la carpeta `perlas/` → **Add file › Upload files** y sube el vídeo (por ejemplo `hemofiltro.mp4`).
2. Edita `perlas.json` y cambia el campo `media` de la perla:

```json
"media": { "tipo": "video", "src": "perlas/hemofiltro.mp4", "poster": "perlas/hemofiltro.jpg" }
```

Tipos admitidos:

| tipo    | Para qué                                               |
|---------|--------------------------------------------------------|
| `video` | MP4 o WebM; se reproduce en bucle, sin sonido, con controles |
| `gif`   | GIF animado o imagen                                    |
| `svg`   | Esquema (animado o no)                                  |
| `null`  | Aún sin vídeo: la tarjeta muestra «Vídeo pendiente»     |

3. Para una perla nueva, copia un bloque entero, cambia el `id` (sin espacios ni tildes), el `titulo`, la `cat` (Circuito, Urgencias, Monitorización o Cuidados), el `resumen` y los `puntos`.

También puedes mandar el vídeo por el chat y se sube por ti.
