import CoreImage
import CoreImage.CIFilterBuiltins
import SwiftUI

/// The paper grain from `noisy-gradient.svg`, generated rather than shipped.
///
/// The web asset is an SVG whose grain comes from an feTurbulence filter, and
/// UIImage cannot load SVG at all. Generating noise once and tiling it gets
/// the same effect without converting anything, and stays sharp at any size.
@MainActor
enum GrainTexture {
    private static var cached: Image?

    /// Tile size: large enough that repetition is not readable, small enough
    /// to generate instantly.
    private static let side = 512

    static var image: Image? {
        if let cached { return cached }

        let context = CIContext()
        guard let noise = CIFilter.randomGenerator().outputImage else { return nil }

        // Desaturate, then push contrast — the SVG filter does the same with a
        // saturate-0 colour matrix followed by a slope-3 component transfer.
        let grey = noise.applyingFilter(
            "CIColorControls",
            parameters: [kCIInputSaturationKey: 0, kCIInputContrastKey: 2.2]
        )
        let extent = CGRect(x: 0, y: 0, width: side, height: side)
        guard let cgImage = context.createCGImage(grey, from: extent) else {
            return nil
        }

        let image = Image(decorative: cgImage, scale: 1, orientation: .up)
        cached = image
        return image
    }
}
