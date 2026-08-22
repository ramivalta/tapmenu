import SwiftUI

/// The ambient screen: what is pouring right now, four across.
///
/// Ambient is the default state and where the display sits almost all the
/// time, so nothing is highlighted until someone actually picks up the remote.
/// tvOS insists on focusing *something* the moment the view appears, and its
/// stock focus effect — a scaled, shadowed, floating card — is calibrated for
/// a television across a room. On a monitor at arm's length it just makes one
/// beer look inexplicably special. So the system effect is switched off and
/// replaced with a quiet marker that appears only while a guest is navigating.
struct MenuScreen: View {
    @Environment(MenuStore.self) private var store

    let onOpen: (Beer) -> Void
    let onOpenCatalogue: () -> Void

    @FocusState private var focusedTap: Int?
    /// Claimed once, not on every poll — otherwise a background refresh yanks
    /// focus back mid-browse.
    @State private var hasClaimedFocus = false
    /// Nil until the remote is touched for the first time.
    @State private var lastInput: Date?
    @State private var showFocus = false

    /// How long after the last input the focus marker stays visible before the
    /// display settles back to ambient.
    private let interactiveWindow: TimeInterval = 5

    var body: some View {
        ZStack {
            if let menu = store.menu {
                MenuBackground(taps: menu.taps)
            }
            content
        }
        .ignoresSafeArea()
        // Any directional input means a guest is driving; reveal the marker.
        .onMoveCommand { _ in
            lastInput = .now
            withAnimation(.easeOut(duration: 0.25)) { showFocus = true }
        }
        .task(id: lastInput) {
            guard lastInput != nil else { return }
            // Must not be `try?`: every keypress changes `lastInput` and so
            // cancels this task, and a swallowed CancellationError would fall
            // straight through to hiding the marker the new press just showed.
            do {
                try await Task.sleep(for: .seconds(interactiveWindow))
            } catch {
                return
            }
            withAnimation(.easeInOut(duration: 0.8)) { showFocus = false }
        }
        .task(id: store.isLoaded) {
            guard !hasClaimedFocus, let menu = store.menu else { return }
            focusedTap = menu.taps.first { $0.beer != nil }?.tapNumber
            hasClaimedFocus = true
        }
    }

    private var content: some View {
        VStack(spacing: 24) {
            Text("Taproom")
                .font(.largeTitle)
                .foregroundStyle(Palette.ink)

            Spacer(minLength: 0)

            if let menu = store.menu {
                HStack(spacing: 20) {
                    ForEach(menu.taps) { tap in
                        TapCard(
                            tap: tap,
                            isFocused: focusedTap == tap.tapNumber,
                            showFocus: showFocus,
                            onOpen: onOpen
                        )
                        .focused($focusedTap, equals: tap.tapNumber)
                    }
                }
            } else if store.lastError != nil {
                ContentUnavailableView(
                    "Cannot reach the brewery server",
                    systemImage: "wifi.exclamationmark",
                    description: Text(store.lastError ?? "")
                )
            } else {
                ProgressView()
            }

            Spacer(minLength: 0)

            Footer(onOpenCatalogue: onOpenCatalogue, showFocus: showFocus)
        }
        .frame(maxHeight: .infinity, alignment: .top)
        .padding(.horizontal, 48)
        .padding(.top, 56)
        .padding(.bottom, 36)
    }
}

private struct TapCard: View {
    let tap: Tap
    let isFocused: Bool
    let showFocus: Bool
    let onOpen: (Beer) -> Void

    private var marked: Bool { isFocused && showFocus }

    private let radius: CGFloat = 18

    private var shape: RoundedRectangle {
        RoundedRectangle(cornerRadius: radius, style: .continuous)
    }

    /// The beer's colour, or nil on an empty tap.
    private var colour: Color? {
        tap.beer.flatMap { Palette.hex($0.color) }
    }

    var body: some View {
        Button {
            if let beer = tap.beer { onOpen(beer) }
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                Text("TAP \(tap.tapNumber)")
                    .font(.caption)
                    .opacity(marked ? 0.85 : 0.55)

                if let beer = tap.beer {
                    Text(beer.name ?? "Untitled")
                        // Names run to 47 characters in the catalogue, so
                        // titles must wrap rather than truncate.
                        .font(.title2)
                        .lineLimit(3)
                        .multilineTextAlignment(.leading)

                    // The one crisp piece of colour on the card. Small enough
                    // to be saturated without the card looking tinted.
                    Rectangle()
                        .fill(colour ?? Palette.ink)
                        .frame(height: 3)
                        .opacity(0.6)
                        .padding(.trailing, 40)

                    Text(beer.style ?? "")
                        .font(.headline)
                        .opacity(0.75)

                    HStack(spacing: 16) {
                        if let abv = beer.abv {
                            Text("\(Format.decimal(abv, max: 1))% ABV")
                        }
                        if let ibu = beer.ibu {
                            Text("\(Format.decimal(ibu, max: 0)) IBU")
                        }
                    }
                    .font(.subheadline)
                    .bold()

                    if let notes = tap.notes {
                        Text(notes).font(.footnote).italic()
                    }

                    Spacer(minLength: 0)

                    HStack(spacing: 0) {
                        Spacer(minLength: 0)
                        if let qr = beer.untappd.flatMap({
                            QRCodeImage.make(from: $0.qrUrl)
                        }) {
                            qr.resizable().frame(width: 96, height: 96)
                        }
                    }
                } else {
                    Text("Currently empty")
                        .font(.title3)
                        .opacity(0.35)
                    Spacer(minLength: 0)
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(24)
            .frame(
                maxWidth: .infinity,
                minHeight: 520,
                maxHeight: 520,
                alignment: .topLeading
            )
            .background { surface }
            .overlay {
                // Focus is a firmer edge, not a lift — the stock tvOS
                // treatment made one beer look inexplicably special.
                shape.strokeBorder(
                    Palette.ink.opacity(marked ? 0.34 : 0.10),
                    lineWidth: marked ? 3 : 1
                )
            }
        }
        .buttonStyle(.bare)
        .disabled(tap.beer == nil)
    }

    /// A translucent panel, as the web cards use, so the wave field still
    /// reads through it. The beer's colour is a faint rise from the base
    /// rather than a tint across the whole card.
    private var surface: some View {
        ZStack(alignment: .bottomLeading) {
            Color.white.opacity(0.45)

            if let colour {
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

            // The tap-number watermark from the web cards, at their opacity
            // rather than the beer's colour — colour reads better in one
            // deliberate place than smeared across every element.
            Text("\(tap.tapNumber)")
                .font(.system(size: 150, weight: .bold))
                .foregroundStyle(Palette.ink)
                .opacity(0.09)
                .offset(x: 4, y: 34)
        }
        .clipShape(shape)
        .shadow(color: Palette.ink.opacity(0.12), radius: 16, y: 6)
    }
}

private struct Footer: View {
    @Environment(MenuStore.self) private var store
    let onOpenCatalogue: () -> Void
    let showFocus: Bool

    var body: some View {
        HStack(spacing: 24) {
            Button("Archived batches", action: onOpenCatalogue)
                .buttonStyle(.bare)
                .font(.callout)
                // Reads as a hint in ambient, as a control once navigating.
                .opacity(showFocus ? 1 : 0.45)

            if let updated = store.menu?.updatedAt {
                Text("Updated \(updated.formatted(date: .abbreviated, time: .omitted))")
                    .font(.caption)
                    .opacity(0.5)
            }

            // A refresh can fail without blanking the screen, so say so quietly
            // rather than replacing the menu with an error.
            if store.lastError != nil, store.menu != nil {
                Label("Offline", systemImage: "wifi.slash")
                    .font(.caption)
                    .opacity(0.5)
            }
        }
        .foregroundStyle(Palette.ink)
    }
}
