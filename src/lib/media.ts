export async function compressImage(
  file: File,
  maxWidth = 1800,
  quality = 0.82,
): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Image must be smaller than 15 MB");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Could not optimize image")),
      "image/webp",
      quality,
    ),
  );
  return new File([blob], `${crypto.randomUUID()}.webp`, {
    type: "image/webp",
  });
}

export type ImageFrame = {
  x: number;
  y: number;
  zoom: number;
};

export function calculateCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  outputWidth: number,
  outputHeight: number,
  frame: ImageFrame,
) {
  const zoom = Math.min(2.5, Math.max(1, frame.zoom));
  const coverScale = Math.max(
    outputWidth / sourceWidth,
    outputHeight / sourceHeight,
  );
  const width = outputWidth / (coverScale * zoom);
  const height = outputHeight / (coverScale * zoom);
  const maxX = Math.max(0, sourceWidth - width);
  const maxY = Math.max(0, sourceHeight - height);
  return {
    x: maxX * (Math.min(100, Math.max(0, frame.x)) / 100),
    y: maxY * (Math.min(100, Math.max(0, frame.y)) / 100),
    width,
    height,
  };
}

export async function frameImage(
  file: File,
  frame: ImageFrame,
  outputWidth = 1200,
  outputHeight = 1500,
): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  const bitmap = await createImageBitmap(file);
  const crop = calculateCoverCrop(
    bitmap.width,
    bitmap.height,
    outputWidth,
    outputHeight,
    frame,
  );
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare the image editor");
  }
  context.drawImage(
    bitmap,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Could not frame image")),
      "image/webp",
      0.86,
    ),
  );
  return new File([blob], `${crypto.randomUUID()}-framed.webp`, {
    type: "image/webp",
  });
}
export const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") && digits.length === 11
    ? `234${digits.slice(1)}`
    : digits;
};
export const whatsappLink = (phone: string, name: string, item: string) =>
  `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(`Hi, my name is ${name}. Happy birthday! I'd like to fulfill your wish for ${item}. Could you share more details?`)}`;
