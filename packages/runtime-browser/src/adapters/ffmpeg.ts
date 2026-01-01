import type { Operation } from "@affectjs/core";

export class FFmpegAdapter {
  convert(operations: Operation[], inputName: string, outputName: string): string[] {
    const args: string[] = ["-i", inputName];
    const filters: string[] = [];

    for (const op of operations) {
      switch (op.type) {
        case "trim":
          // Handled by -ss and -t usually placed before input for fast seek or after for precise
          // For simplicity, let's put simple args here.
          // But complex filters need filter_complex.
          break;
        case "resize": {
          const { width, height } = op as unknown as {
            width: number | string;
            height: number | string;
          };
          filters.push(`scale=${width}:${height}`);
          break;
        }
        case "filter": {
          const { name, value } = op as unknown as { name: string; value: string | number };
          filters.push(`${name}=${value}`);
          break;
        }
        case "crop": {
          const { width, height, x, y } = op as unknown as {
            width: number;
            height: number;
            x: number;
            y: number;
          };
          filters.push(`crop=${width}:${height}:${x}:${y}`);
          break;
        }
        case "rotate": {
          const { angle } = op as unknown as { angle: number | string };
          filters.push(`rotate=${angle}`);
          break;
        }
        // ... handled other ops
      }
    }

    if (filters.length > 0) {
      args.push("-vf", filters.join(","));
    }

    // Encoding ops usually map to output options
    for (const op of operations) {
      if (op.type === "encode") {
        const { codec, param } = op as unknown as { codec?: string; param?: number };
        if (codec) args.push("-c:v", codec);
        if (param) args.push("-b:v", String(param));
      }
    }

    args.push(outputName);
    return args;
  }
}
