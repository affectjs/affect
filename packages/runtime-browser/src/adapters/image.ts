import type { Operation, ExecutionResult } from "@affectjs/core";

export class ImageAdapter {
  async execute(operations: Operation[], inputBlob: Blob): Promise<ExecutionResult> {
    const bitmap = await createImageBitmap(inputBlob);
    const width = bitmap.width;
    const height = bitmap.height;

    // Use OffscreenCanvas if available, fully compatible with Worker
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");

    ctx.drawImage(bitmap, 0, 0);

    // Apply operations
    for (const op of operations) {
      if (op.type === "resize") {
        const { width: newWidth, height: newHeight } = op as unknown as {
          width: number;
          height: number;
        };
        // In canvas, resizing usually means drawing to a new canvas or scaling
        // For simplicity here, we might just scale the final output or use intermediate canvas
        // Real implementation would be more complex chain.
        // Placeholder implementation for resize:
        const resizedCanvas = new OffscreenCanvas(newWidth, newHeight);
        const rCtx = resizedCanvas.getContext("2d");
        if (rCtx) {
          rCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
          // Replace current canvas
          // (In a real class we'd manage state better)
        }
      } else if (op.type === "filter") {
        const { name } = op as unknown as { name: string };
        if (name === "grayscale") {
          ctx.filter = "grayscale(100%)";
          // Re-draw to apply filter
          ctx.drawImage(canvas, 0, 0);
          ctx.filter = "none";
        }
      }
    }

    // Export
    const blob = await canvas.convertToBlob({ type: inputBlob.type });
    return {
      success: true,
      output: blob,
      metrics: {
        duration: 0,
      },
    };
  }
}
