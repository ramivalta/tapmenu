import SwiftUI

/// Everything about one beer, on one screen.
///
/// Laid out to fit without scrolling: a wall display should not require
/// someone to scroll to read a recipe, and the longest hop bill in the data
/// (the NEIPA's ten additions across four uses) previously ran off the bottom.
///
/// Works for a beer on tap and one from the catalogue — the server returns the
/// same shape for both.
struct BeerDetailScreen: View {
    let beer: Beer

    /// Read off Untappd's public page when the screen opens. Nil until it
    /// arrives, and stays nil if the fetch or the parse fails — the figures
    /// are a bonus, never a reason to show an error.
    @State private var untappdStats: Untappd.Stats?

    private var colour: Color { Palette.hex(beer.color) ?? Palette.ink }

    var body: some View {
        // Kept as a ScrollView purely as a safety net for a recipe longer than
        // anything in the archive; the layout is built to fit.
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // The scan code sits beside the header rather than in its own
                // full-height column: it is short, and giving it a column of
                // its own was costing the hop bill the room it needed.
                HStack(alignment: .top, spacing: 24) {
                    header

                    // 18% of the catalogue has no Untappd link, so this is
                    // dropped entirely rather than leaving a gap.
                    if let qr = beer.untappd.flatMap({ QRCodeImage.make(from: $0.qrUrl) }) {
                        untappd(qr).frame(width: 440)
                    }
                }

                HStack(alignment: .top, spacing: 24) {
                    if !beer.hops.isEmpty {
                        hops.frame(maxWidth: .infinity, alignment: .topLeading)
                    }

                    VStack(spacing: 24) {
                        if !beer.fermentables.isEmpty { malt }
                        if !beer.yeasts.isEmpty { yeast }
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, alignment: .topLeading)
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(56)
        }
        .task(id: beer.untappd?.beerID) {
            guard let id = beer.untappd?.beerID else { return }
            untappdStats = await Untappd.stats(beerID: id)
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(beer.name ?? "Untitled")
                .font(.largeTitle)
                .lineLimit(2)
                .minimumScaleFactor(0.5)

            Rectangle()
                .fill(colour)
                .frame(maxWidth: 460)
                .frame(height: 4)
                .opacity(0.7)

            if let style = beer.style {
                Text(style)
                    .font(.title3)
                    .opacity(0.75)
            }

            HStack(spacing: 12) {
                if let abv = beer.abv { stat("\(Format.decimal(abv, max: 1))%", "ABV") }
                if let ibu = beer.ibu { stat(Format.decimal(ibu, max: 0), "IBU") }
                if let srm = beer.srm { stat(Format.decimal(srm, max: 1), "SRM") }
                if let kegged = beer.keggedOn {
                    stat(kegged.formatted(.dateTime.month().year()), "Kegged")
                }
                if let brewed = beer.brewedOn {
                    stat(brewed.formatted(.dateTime.month().year()), "Brewed")
                }
            }
            .padding(.top, 4)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            // The same faint rise of the beer's colour the menu cards carry.
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0),
                    .init(color: colour.opacity(0.07), location: 0.55),
                    .init(color: colour.opacity(0.18), location: 1),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        }
        .panel()
    }

    /// Value over label, as the web's mobile card does it.
    private func stat(_ value: String, _ label: String, compact: Bool = false) -> some View {
        VStack(spacing: 2) {
            Text(value).font(compact ? .headline : .title3).bold()
            Text(label.uppercased())
                .font(.caption2)
                .tracking(1.5)
                .opacity(0.6)
        }
        .padding(.vertical, compact ? 8 : 10)
        .padding(.horizontal, compact ? 12 : 18)
        .background(Palette.ink.opacity(0.07))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // MARK: - Sections

    private var hops: some View {
        section("Hops") {
            // Pre-grouped, pre-summed and in brew order from the server, so
            // this is a straight render.
            HStack(alignment: .top, spacing: 28) {
                ForEach(Array(hopColumns.enumerated()), id: \.offset) { _, column in
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(column) { group in
                            Text(group.use)
                                .font(.headline)
                                .padding(.top, 10)

                            ForEach(group.hops, id: \.name) { hop in
                                row(hop.name, amount: hop.amount, unit: "g")
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .topLeading)
                }
            }
        }
    }

    /// A long hop bill goes to two columns. The NEIPA runs to ten additions
    /// across four uses, which is taller than the screen in one column.
    /// Groups are never split across columns — a use reads as one block.
    private var hopColumns: [[Beer.HopGroup]] {
        // A group costs its rows plus its heading.
        let weight = { (group: Beer.HopGroup) in group.hops.count + 1 }
        let total = beer.hops.reduce(0) { $0 + weight($1) }
        guard total > 9 else { return [beer.hops] }

        var first: [Beer.HopGroup] = []
        var second: [Beer.HopGroup] = []
        var filled = 0
        for group in beer.hops {
            if filled < total / 2 {
                first.append(group)
                filled += weight(group)
            } else {
                second.append(group)
            }
        }
        return second.isEmpty ? [first] : [first, second]
    }

    private var malt: some View {
        section("Malt") {
            ForEach(beer.fermentables, id: \.name) { item in
                row(item.name, amount: item.amount, unit: "kg")
            }
        }
    }

    private var yeast: some View {
        section("Yeast") {
            ForEach(beer.yeasts, id: \.name) { item in
                Text([item.name, item.productId].compactMap { $0 }.joined(separator: " · "))
                    .font(.body)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    /// Laid out across rather than down: stacked, it stood taller than the
    /// header beside it, and there is plenty of width going spare.
    private func untappd(_ qr: Image) -> some View {
        HStack(spacing: 22) {
            qr.resizable()
                .frame(width: 168, height: 168)
                .padding(10)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 12) {
                Text("Scan to rate on Untappd")
                    .font(.callout)
                    .opacity(0.75)
                    .fixedSize(horizontal: false, vertical: true)

                // The figures arrive after the screen is already up, so their
                // row is laid out from the start and merely filled in later.
                // Letting it appear would resize the panel — and with it
                // everything below — a second or so after opening the beer.
                ZStack(alignment: .leading) {
                    if let stats = untappdStats, stats.isWorthShowing {
                        HStack(spacing: 10) {
                            if let checkins = stats.checkins {
                                stat(
                                    "\(checkins)",
                                    checkins == 1 ? "Check-in" : "Check-ins",
                                    compact: true
                                )
                            }
                            // Absent until Untappd has enough ratings to
                            // publish a score, which is most of the catalogue.
                            if let rating = stats.rating {
                                stat(
                                    Format.decimal(rating, max: 2),
                                    "Rating",
                                    compact: true
                                )
                            }
                        }
                        .transition(.opacity)
                    }
                }
                .frame(height: 62)
                .animation(.easeIn(duration: 0.3), value: untappdStats)
            }

            Spacer(minLength: 0)
        }
        .padding(24)
        // Fills the header's height rather than setting the row's.
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .panel()
    }

    private func section<Content: View>(
        _ title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased())
                .font(.caption)
                .tracking(2)
                .opacity(0.5)
                .padding(.bottom, 2)

            content()
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .panel()
    }

    private func row(_ name: String, amount: Double?, unit: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(name)
            Spacer(minLength: 20)
            if let amount {
                Text("\(Format.decimal(amount, max: 1)) \(unit)").opacity(0.65)
            }
        }
        .font(.body)
    }
}
