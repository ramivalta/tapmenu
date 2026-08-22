import SwiftUI

/// The full story on one beer: hop schedule, malt bill, yeast, dates, QR.
///
/// Works for a beer on tap and one from the catalogue — the server returns the
/// same shape for both.
struct BeerDetailScreen: View {
    let beer: Beer

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                header

                HStack(alignment: .top, spacing: 64) {
                    if !beer.hops.isEmpty {
                        section("Hops") {
                            // Pre-grouped and pre-summed by the server, in brew
                            // order, so this is a straight render.
                            ForEach(beer.hops) { group in
                                Text(group.use)
                                    .font(.headline)
                                    .padding(.top, 8)
                                ForEach(group.hops, id: \.name) { hop in
                                    row(hop.name, amount: hop.amount, unit: "g")
                                }
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 32) {
                        if !beer.fermentables.isEmpty {
                            section("Malt") {
                                ForEach(beer.fermentables, id: \.name) { item in
                                    row(item.name, amount: item.amount, unit: "kg")
                                }
                            }
                        }

                        if !beer.yeasts.isEmpty {
                            section("Yeast") {
                                ForEach(beer.yeasts, id: \.name) { yeast in
                                    Text(
                                        [yeast.name, yeast.productId]
                                            .compactMap { $0 }
                                            .joined(separator: " · ")
                                    )
                                }
                            }
                        }
                    }

                    // 18% of the catalogue has no Untappd link, so the absence
                    // has to look deliberate rather than like a missing image.
                    if let qr = beer.untappd.flatMap({ QRCodeImage.make(from: $0.qrUrl) }) {
                        VStack(spacing: 12) {
                            qr.resizable().frame(width: 260, height: 260)
                            Text("Rate on Untappd").font(.caption)
                        }
                    }
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(64)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(beer.name ?? "Untitled")
                .font(.largeTitle)
                .lineLimit(3)

            Text(beer.style ?? "")
                .font(.title2)
                .opacity(0.8)

            HStack(spacing: 24) {
                if let abv = beer.abv { stat("\(Format.decimal(abv, max: 1))%", "ABV") }
                if let ibu = beer.ibu { stat("\(Int(ibu))", "IBU") }
                if let srm = beer.srm { stat(Format.decimal(srm, max: 1), "SRM") }
                if let kegged = beer.keggedOn {
                    stat(kegged.formatted(.dateTime.month().year()), "Kegged")
                }
                if let brewed = beer.brewedOn {
                    stat(brewed.formatted(.dateTime.month().year()), "Brewed")
                }
            }
        }
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title3).bold()
            Text(label.uppercased()).font(.caption2).opacity(0.6)
        }
    }

    private func section<Content: View>(
        _ title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.caption)
                .tracking(2)
                .opacity(0.5)
            content()
        }
    }

    private func row(_ name: String, amount: Double?, unit: String) -> some View {
        HStack {
            Text(name)
            Spacer(minLength: 24)
            if let amount {
                Text("\(Format.decimal(amount, max: 1)) \(unit)").opacity(0.7)
            }
        }
        .font(.body)
    }
}
