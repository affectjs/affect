/**
 * Image testing utilities using pixelmatch
 */

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { existsSync } from "fs";

/**
 * Compare two images and return the number of different pixels
 * @param image1Path Path to first image
 * @param image2Path Path to second image
 * @param threshold Difference threshold (0-1), default 0.1
 * @returns Number of different pixels, or null if images can't be compared
 */
export async function compareImages(
    image1Path: string,
    image2Path: string,
    threshold: number = 0.1
): Promise<{ diffPixels: number; totalPixels: number; match: boolean } | null> {
    if (!existsSync(image1Path) || !existsSync(image2Path)) {
        return null;
    }

    try {
        // Dynamic import to avoid module resolution issues
        const sharp = (await import("sharp")).default;

        // Convert both images to PNG buffers with same dimensions
        const img1Buffer = await sharp(image1Path)
            .resize(1920, 1080, { fit: "contain" })
            .png()
            .toBuffer();
        const img2Buffer = await sharp(image2Path)
            .resize(1920, 1080, { fit: "contain" })
            .png()
            .toBuffer();

        // Parse PNG buffers
        const img1 = PNG.sync.read(img1Buffer);
        const img2 = PNG.sync.read(img2Buffer);

        // Ensure same dimensions
        if (img1.width !== img2.width || img1.height !== img2.height) {
            // Resize to match - use the smaller dimensions
            const targetWidth = Math.min(img1.width, img2.width);
            const targetHeight = Math.min(img1.height, img2.height);
            const resized1 = await sharp(img1Buffer)
                .resize(targetWidth, targetHeight)
                .png()
                .toBuffer();
            const resized2 = await sharp(img2Buffer)
                .resize(targetWidth, targetHeight)
                .png()
                .toBuffer();
            const png1 = PNG.sync.read(resized1);
            const png2 = PNG.sync.read(resized2);
            return comparePNGs(png1, png2, threshold);
        }

        return comparePNGs(img1, img2, threshold);
    } catch (error) {
        console.error("Error comparing images:", error);
        return null;
    }
}

/**
 * Compare two PNG images
 */
function comparePNGs(
    img1: PNG,
    img2: PNG,
    threshold: number
): { diffPixels: number; totalPixels: number; match: boolean } {
    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);
    const totalPixels = width * height;

    // Create diff image
    const diff = new PNG({ width, height });

    // Compare pixels
    const numDiffPixels = pixelmatch(
        img1.data,
        img2.data,
        diff.data,
        width,
        height,
        {
            threshold,
        }
    );

    const match = numDiffPixels === 0;

    return {
        diffPixels: numDiffPixels,
        totalPixels,
        match,
    };
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
    imagePath: string
): Promise<{ width: number; height: number } | null> {
    if (!existsSync(imagePath)) {
        return null;
    }

    try {
        // Dynamic import to avoid module resolution issues
        const sharp = (await import("sharp")).default;
        const metadata = await sharp(imagePath).metadata();
        return {
            width: metadata.width || 0,
            height: metadata.height || 0,
        };
    } catch (error) {
        console.error("Error getting image dimensions:", error);
        return null;
    }
}

/**
 * Verify image was resized correctly
 */
export async function verifyResize(
    outputPath: string,
    expectedWidth: number,
    expectedHeight: number,
    tolerance: number = 5
): Promise<boolean> {
    const dimensions = await getImageDimensions(outputPath);
    if (!dimensions) {
        return false;
    }

    const widthMatch =
        Math.abs(dimensions.width - expectedWidth) <= tolerance;
    const heightMatch =
        Math.abs(dimensions.height - expectedHeight) <= tolerance;

    return widthMatch && heightMatch;
}

