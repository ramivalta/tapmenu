import CoreImage
import CoreImage.CIFilterBuiltins
import SwiftUI

/// Renders a QR code locally — no network, no third-party dependency.
///
/// The server already hands us Untappd's short redirect rather than the long
/// beer URL, which keeps the module count low. That matters here: fewer
/// modules means chunkier pixels, and the display is only 1080p.
enum QRCodeImage {
    private static let context = CIContext()

    static func make(from string: String) -> Image? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        // Medium correction: enough resilience for a screen, fewer modules
        // than the higher levels would add.
        filter.correctionLevel = "M"

        guard let output = filter.outputImage else { return nil }
        // Scale up before rasterising so the code stays crisp rather than
        // being interpolated up by the view.
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else {
            return nil
        }
        return Image(decorative: cgImage, scale: 1, orientation: .up)
            .interpolation(.none)
    }
}
