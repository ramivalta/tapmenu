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
    let onAssign: (Int) -> Void
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
            RocketLogo(rocketHeight: 150)

            Spacer(minLength: 0)

            if let menu = store.menu {
                HStack(spacing: 32) {
                    ForEach(menu.taps) { tap in
                        TapCard(
                            tap: tap,
                            isFocused: focusedTap == tap.tapNumber,
                            showFocus: showFocus,
                            onOpen: onOpen,
                            onAssign: onAssign
                        )
                        .focused($focusedTap, equals: tap.tapNumber)
                    }
                }
                // Needed in both directions. Coming back up from the footer,
                // the only card directly above the centred button is tap 2 —
                // and an empty tap is not focusable, so without a section to
                // enter, focus had nowhere to go and stayed put.
                .focusSection()
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
    let onAssign: (Int) -> Void

    private var marked: Bool { isFocused && showFocus }

    private var shape: RoundedRectangle { Surface.shape }

    /// The beer's colour, or nil on an empty tap.
    private var colour: Color? {
        tap.beer.flatMap { Palette.hex($0.color) }
    }

    var body: some View {
        Button {
            if let beer = tap.beer {
                onOpen(beer)
            } else {
                onAssign(tap.tapNumber)
            }
        } label: {
            VStack(alignment: .leading, spacing: 16) {
                // No "TAP n" label: the oversized number at the foot of the
                // card already says which tap this is.
                if let beer = tap.beer {
                    Text(beer.name ?? "Untitled")
                        // Names run to 47 characters, so rather than spilling
                        // to a third line they shrink to fit two. Cards keep
                        // a consistent shape whatever is on tap.
                        .font(.title2)
                        .lineLimit(2)
                        .minimumScaleFactor(0.5)
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

                    // Only offered once someone is actually navigating; the
                    // ambient display should not read as a set of buttons.
                    if marked {
                        Text("Press to choose a beer")
                            .font(.footnote)
                            .opacity(0.65)
                            .transition(.opacity)
                    }

                    Spacer(minLength: 0)
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(32)
            .frame(
                maxWidth: .infinity,
                minHeight: 548,
                maxHeight: 548,
                alignment: .topLeading
            )
            .background { surface }
            .overlay {
                shape.strokeBorder(
                    marked ? Palette.ink.opacity(0.22) : Surface.stroke,
                    lineWidth: marked ? 2 : 1
                )
            }
            // A lift like tvOS's own, but ours rather than the button style's.
            // The stock effect cannot be gated: it ignores `showFocus` and so
            // would sit on a card from launch, which is what made one beer
            // look inexplicably special on an untouched display. Driving it
            // ourselves means it only appears once a guest picks up the remote.
            .scaleEffect(marked ? 1.07 : 1)
            // Rises as well as grows, which is most of what reads as "lifted".
            .offset(y: marked ? -8 : 0)
            .animation(.easeOut(duration: 0.22), value: marked)
        }
        .buttonStyle(.bare)
    }

    /// A translucent panel, as the web cards use, so the wave field still
    /// reads through it. The beer's colour is a faint rise from the base
    /// rather than a tint across the whole card.
    private var surface: some View {
        ZStack(alignment: .bottomLeading) {
            // Brighter when focused, so the card reads as raised off the
            // backdrop rather than merely outlined.
            Color.white.opacity(marked ? 0.90 : 0.45)

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
        .shadow(
            color: Color.black.opacity(marked ? 0.22 : 0.16),
            radius: marked ? 18 : Surface.shadowNearRadius,
            y: marked ? 12 : Surface.shadowNearY
        )
        .shadow(
            color: Color.black.opacity(marked ? 0.50 : 0.38),
            radius: marked ? 72 : Surface.shadowFarRadius,
            y: marked ? 50 : Surface.shadowFarY
        )
    }
}

private struct Footer: View {
    @Environment(MenuStore.self) private var store
    let onOpenCatalogue: () -> Void
    let showFocus: Bool

    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 24) {
            Button("Archived batches", action: onOpenCatalogue)
                .buttonStyle(.bare)
                .font(.callout)
                .padding(.vertical, 10)
                .padding(.horizontal, 22)
                .background(focused ? Palette.ink.opacity(0.10) : .clear)
                .clipShape(Capsule())
                .overlay {
                    if focused {
                        Capsule().strokeBorder(Palette.ink.opacity(0.34), lineWidth: 2)
                    }
                }
                .focused($focused)
                // Reads as a hint in ambient, as a control once navigating.
                .opacity(showFocus || focused ? 1 : 0.45)

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
        // Full width so the section's frame sits under every card. Marking it
        // a focus section is not enough on its own: the section still has to
        // lie in the direction of travel, and a centre-hugging footer left the
        // outer cards with nothing beneath them to move into. Content stays
        // centred; only the section's frame grows.
        .frame(maxWidth: .infinity)
        .focusSection()
    }
}
