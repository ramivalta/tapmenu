import SwiftUI

/// The ambient screen: what is pouring right now.
///
/// Laid out as the web taproom is — one board holding four flush columns,
/// rather than four separate floating cards. The single container is what
/// gives the menu its structure: gaps between cards read as four unrelated
/// panels, where a divided board reads as one menu with four taps on it.
///
/// Nothing is highlighted until someone picks up the remote. tvOS focuses
/// something the moment a view appears, and its stock focus effect is built
/// for a television across a room; on a monitor at arm's length it made one
/// beer look inexplicably special on an untouched display.
struct MenuScreen: View {
    @Environment(MenuStore.self) private var store

    let onOpen: (Beer) -> Void
    let onAssign: (Int) -> Void
    let onOpenCatalogue: () -> Void

    @FocusState private var focusedTap: Int?

    private enum TapAction: Hashable { case change, remove, cancel }
    @FocusState private var actionsFocus: TapAction?
    /// Anchors focus inside the action menu so it is confined to its buttons.
    @Namespace private var actionsScope
    /// Claimed once, not on every poll — otherwise a background refresh yanks
    /// focus back mid-browse.
    @State private var hasClaimedFocus = false
    /// Nil until the remote is touched for the first time.
    @State private var lastInput: Date?
    @State private var showFocus = false
    /// Set when a long press asks to take a beer off a tap.
    @State private var removingTap: Int?
    /// The tap whose long-press menu is showing, if any.
    @State private var actionsForTap: Int?
    /// The board's rendered size, needed to place condensation in points and
    /// to hand the refraction shader coordinates it can use.
    @State private var boardSize: CGSize = .zero

    /// True while either the long-press action menu or the code prompt is up.
    /// Both are modal: while one is showing, the board and footer behind must
    /// be taken out of the focus engine so directional input cannot escape the
    /// overlay. A translucent dim looks like a barrier but is not one — only
    /// disabling the content behind actually confines focus.
    private var overlayPresented: Bool {
        actionsForTap != nil || removingTap != nil
    }

    /// How long after the last input the focus marker stays visible before the
    /// display settles back to ambient.
    private let interactiveWindow: TimeInterval = 5

    /// The web board is 4 × 420pt and centred rather than full-bleed, which is
    /// most of why it sits better on the screen than something edge to edge.
    private let boardWidth: CGFloat = 1680
    private var boardShape: RoundedRectangle {
        RoundedRectangle(cornerRadius: 10, style: .continuous)
    }

    var body: some View {
        ZStack {
            TaproomBackdrop()
            // The wave field, back after the aerial map and the caustic
            // network were both tried and set aside. It sits between the
            // backdrop and the board, and shows through the board's
            // translucent columns.
            if let menu = store.menu {
                MenuBackground(taps: menu.taps)
            }
            // Disabled while an overlay is up: a disabled subtree leaves the
            // focus engine entirely, so the board and footer can no longer
            // steal focus from the modal on top of them.
            content
                .disabled(overlayPresented)
        }
        .overlay {
            if let tap = actionsForTap {
                tapActions(for: tap)
            }
        }
        .overlay {
            if let tap = removingTap {
                CodeEntry(
                    title: "Take tap \(tap) off",
                    subtitle: store.menu?.taps
                        .first { $0.tapNumber == tap }?.beer?.name,
                    submit: { await clear(tap: tap, code: $0) },
                    cancel: { removingTap = nil }
                )
            }
        }
        .ignoresSafeArea()
        // The Menu button sends an exit command; unhandled, it leaves the app.
        // While a modal is up, catch it and peel one layer instead — the code
        // prompt first if it is showing, then the action menu — so Back means
        // "back out of this step", not "quit the display". The handler is only
        // attached when a modal is present: `.onExitCommand` always consumes
        // the press once attached, so on the bare board it is left off entirely
        // and Back keeps its normal behaviour rather than being swallowed.
        .modifier(DismissOnExit(active: overlayPresented, dismiss: dismissTopOverlay))
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
                ?? menu.taps.first?.tapNumber
            hasClaimedFocus = true
        }
    }

    private var content: some View {
        VStack(spacing: 20) {
            RocketLogo(rocketHeight: 172)

            Text("Taproom menu")
                .font(.title2)
                .foregroundStyle(Palette.ink)

            Spacer(minLength: 0)

            if let menu = store.menu {
                board(menu)
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
        .padding(.top, 40)
        .padding(.bottom, 32)
    }

    /// How far below the board a falling drop is followed before it fades.
    private let fallZone: CGFloat = 260

    private func board(_ menu: TapMenu) -> some View {
        // Driven per frame so the shader's drop positions stay in step with
        // the painted ones. The subtree is four columns of text, so
        // re-evaluating it is cheap; letting the two drift apart is not.
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
            let drops = Condensation.drops(
                at: context.date.timeIntervalSinceReferenceDate,
                boardSize: boardSize,
                fallZone: fallZone
            )

            columns(menu)
            .frame(maxWidth: boardWidth)
            .onGeometryChange(for: CGSize.self) { $0.size } action: { boardSize = $0 }
            // Clipped so each column's colour stops at the board's edge, as
            // the web's `overflow: hidden` does.
            .clipShape(boardShape)
            .overlay { boardShape.strokeBorder(Surface.stroke, lineWidth: 1) }
            // Refraction: each bead distorts the board's own pixels beneath
            // it. Applied here so it samples the finished columns — text,
            // colour and numerals — and before the drops are painted, so the
            // lens shading is not itself refracted.
            .layerEffect(
                ShaderLibrary.droplets(
                    .floatArray(Condensation.shaderArguments(drops))
                ),
                maxSampleOffset: CGSize(width: 90, height: 90)
            )
            .shadow(
                color: Surface.shadowNear,
                radius: Surface.shadowNearRadius,
                y: Surface.shadowNearY
            )
            .shadow(
                color: Surface.shadowFar,
                radius: Surface.shadowFarRadius,
                y: Surface.shadowFarY
            )
            // The beads themselves, painted over the refracted board and
            // after the shadows: a drop leaving the bottom edge must not be
            // clipped, and must not be given the board's own drop shadow.
            .overlay(alignment: .top) {
                Condensation(drops: drops)
                    .frame(
                        width: boardSize.width,
                        height: boardSize.height + fallZone
                    )
            }
            // Needed in both directions. Coming back up from the footer, the
            // only column directly above the centred button may be an empty
            // one, and without a section to enter focus had nowhere to go.
            .focusSection()
        }
    }

    private func columns(_ menu: TapMenu) -> some View {
        HStack(spacing: 0) {
            ForEach(menu.taps) { tap in
                TapColumn(
                    tap: tap,
                    isFocused: focusedTap == tap.tapNumber,
                    showFocus: showFocus,
                    onOpen: onOpen,
                    onAssign: onAssign,
                    onLongPress: { actionsForTap = $0 }
                )
                .focused($focusedTap, equals: tap.tapNumber)
            }
        }
    }

    /// What a long press offers. Deliberately ours rather than the system's
    /// context menu — see the note on the column's gesture.
    private func tapActions(for tap: Int) -> some View {
        let beer = store.menu?.taps.first { $0.tapNumber == tap }?.beer

        return ZStack {
            // Purely a scrim now. The board behind is `.disabled` while this
            // is up (see `overlayPresented`), which is what actually keeps
            // focus from escaping — the dim only sets the menu apart visually.
            Color.black.opacity(0.45).ignoresSafeArea()

            VStack(alignment: .leading, spacing: 18) {
                Text("Tap \(tap)")
                    .font(.caption)
                    .tracking(2)
                    .opacity(0.55)

                if let name = beer?.name {
                    Text(name).font(.title2).italic().bold().lineLimit(2)
                }

                VStack(alignment: .leading, spacing: 10) {
                    Button("Choose a different beer") {
                        actionsForTap = nil
                        onAssign(tap)
                    }
                    .focused($actionsFocus, equals: .change)

                    Button("Take this beer off", role: .destructive) {
                        actionsForTap = nil
                        removingTap = tap
                    }
                    .focused($actionsFocus, equals: .remove)

                    Button("Cancel") { actionsForTap = nil }
                        .focused($actionsFocus, equals: .cancel)
                }
                // Confines the focus engine to these three buttons, so a
                // directional press cannot wander out of the menu.
                .focusScope(actionsScope)
            }
            .foregroundStyle(Palette.ink)
            .padding(36)
            .frame(maxWidth: 620, alignment: .leading)
            .panel()
            // The buttons do not exist when the gesture fires, so focus is
            // claimed once they are actually on screen.
            .onAppear { actionsFocus = .change }
        }
    }

    /// Peels the topmost modal layer: the code prompt if it is up, otherwise
    /// the action menu. Called by Back so a press steps out one layer at a
    /// time rather than dismissing everything or leaving the app.
    private func dismissTopOverlay() {
        if removingTap != nil {
            removingTap = nil
        } else if actionsForTap != nil {
            actionsForTap = nil
        }
    }

    /// Attaches `.onExitCommand` only while a modal is up. `.onExitCommand`
    /// consumes the Back press whenever it is present, so applying it
    /// conditionally is what lets Back leave the app from the bare board yet
    /// merely dismiss the modal when one is showing.
    private struct DismissOnExit: ViewModifier {
        let active: Bool
        let dismiss: () -> Void

        func body(content: Content) -> some View {
            if active {
                content.onExitCommand(perform: dismiss)
            } else {
                content
            }
        }
    }

    /// Returns an error to show, or nil once the tap is cleared.
    private func clear(tap: Int, code: String) async -> String? {
        do {
            // A nil batch id is how the server empties a tap.
            try await MenuAPI.assign(tap: tap, batchId: nil, code: code)
            await store.refresh()
            removingTap = nil
            return nil
        } catch {
            return error.localizedDescription
        }
    }
}

/// One tap on the board. Flush against its neighbours — no shadow, no corner
/// radius, no gap; the board owns all of that.
private struct TapColumn: View {
    let tap: Tap
    let isFocused: Bool
    let showFocus: Bool
    let onOpen: (Beer) -> Void
    let onAssign: (Int) -> Void
    let onLongPress: (Int) -> Void

    private var marked: Bool { isFocused && showFocus }

    private var colour: Color? {
        tap.beer.flatMap { Palette.hex($0.color) }
    }

    /// "7,7% ABV | 37 IBU", as one string so it can never break mid-phrase.
    private func strengthLine(_ beer: Beer) -> String {
        [
            beer.abv.map { "\(Format.decimal($0, max: 1))% ABV" },
            beer.ibu.map { "\(Format.decimal($0, max: 0)) IBU" },
        ]
        .compactMap { $0 }
        .joined(separator: "  |  ")
    }

    var body: some View {
        Button {
            if let beer = tap.beer {
                onOpen(beer)
            } else {
                onAssign(tap.tapNumber)
            }
        } label: {
            VStack(alignment: .leading, spacing: 14) {
                if let beer = tap.beer {
                    // Open Sans 700 italic on the web; echoed here with the
                    // system face, which is not bundled with the app.
                    Text(beer.name ?? "Untitled")
                        .font(.body)
                        .italic()
                        .bold()
                        .lineLimit(2)
                        .minimumScaleFactor(0.5)
                        .multilineTextAlignment(.leading)

                    Rectangle()
                        .fill(Palette.ink)
                        .frame(height: 3)

                    Text(strengthLine(beer))
                        .font(.callout)
                        .bold()
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)

                    if let style = beer.style {
                        Text(style)
                            .font(.callout.smallCaps())
                            .opacity(0.85)
                            .lineLimit(2)
                            .minimumScaleFactor(0.7)
                    }

                    if let kegged = beer.keggedOn {
                        Text("Kegitetty \(kegged.formatted(.dateTime.month(.twoDigits).year()))")
                            .font(.caption)
                            .opacity(0.7)
                    }

                    if let notes = tap.notes {
                        Text(notes).font(.caption2).italic().opacity(0.8)
                    }

                    Spacer(minLength: 0)
                } else {
                    Text("Currently empty")
                        .font(.body)
                        .opacity(0.3)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)

                    // Only offered once someone is actually navigating; the
                    // ambient display should not read as a set of buttons.
                    if marked {
                        Text("Press to choose a beer")
                            .font(.caption2)
                            .opacity(0.7)
                            .transition(.opacity)
                    }

                    Spacer(minLength: 0)
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(28)
            .frame(
                maxWidth: .infinity,
                minHeight: 470,
                maxHeight: 470,
                alignment: .topLeading
            )
            // Pinned to the bottom-right, out of the text flow, so it clears
            // the tap-number watermark that sits in the bottom-left corner.
            .overlay(alignment: .bottomTrailing) {
                if let qr = tap.beer?.untappd.flatMap({
                    QRCodeImage.make(from: $0.qrUrl)
                }) {
                    qr.resizable()
                        .frame(width: 96, height: 96)
                        .padding(28)
                }
            }
            .background { background }
        }
        .buttonStyle(.bare)
        // Not `.contextMenu`: the board re-evaluates every frame to feed the
        // refraction shader, so a presented menu's source view is rebuilt
        // under it 30 times a second and flickers wildly. The menu is put up
        // by MenuScreen instead, outside the TimelineView.
        //
        // Not `.onLongPressGesture` either: on tvOS a long-press gesture
        // layered on a focusable Button never fires. The Siri Remote's select
        // is a discrete click that the Button claims for its primary action,
        // and there is no touch-and-dwell for the gesture to observe — so the
        // hold was silently swallowed. The hold is instead expressed as a
        // LongPressGesture on the select press, given priority over the
        // button so the dwell is seen before the click is delivered.
        .highPriorityGesture(
            LongPressGesture(minimumDuration: 0.45)
                .onEnded { _ in
                    if tap.beer != nil { onLongPress(tap.tapNumber) }
                }
        )
    }

    /// Focus cannot lift a flush column without breaking the board, so it
    /// brightens the column and lights a bar across its top instead.
    private var background: some View {
        ZStack(alignment: .bottomLeading) {
            Color.white.opacity(marked ? 0.92 : 0.45)

            if let colour {
                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0),
                        .init(color: colour.opacity(0.06), location: 0.5),
                        .init(color: colour.opacity(0.20), location: 1),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }

            // The web's 124px watermark, with its full stop.
            Text("\(tap.tapNumber).")
                .font(.system(size: 124, weight: .bold))
                .foregroundStyle(Palette.ink)
                .opacity(0.26)
                .padding(.leading, 24)
                .padding(.bottom, 16)
        }
        .overlay(alignment: .bottom) {
            // The solid colour strip along the foot of the column.
            if let colour {
                Rectangle()
                    .fill(colour)
                    .frame(height: 14)
                    .opacity(marked ? 0.9 : 0.55)
            }
        }
        .overlay(alignment: .top) {
            if marked {
                Rectangle()
                    .fill(colour ?? Palette.ink)
                    .frame(height: 5)
                    .transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.2), value: marked)
    }
}

private struct Footer: View {
    @Environment(MenuStore.self) private var store
    let onOpenCatalogue: () -> Void
    let showFocus: Bool

    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 24) {
            Button("See archived batches", action: onOpenCatalogue)
                .buttonStyle(.bare)
                .font(.footnote)
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
                Text("Updated \(updated.formatted(date: .numeric, time: .omitted))")
                    .font(.caption2)
                    .opacity(0.5)
            }

            // A refresh can fail without blanking the screen, so say so quietly
            // rather than replacing the menu with an error.
            if store.lastError != nil, store.menu != nil {
                Label("Offline", systemImage: "wifi.slash")
                    .font(.caption2)
                    .opacity(0.5)
            }
        }
        .foregroundStyle(Palette.ink)
        // Full width so the section's frame sits under every column. Marking it
        // a focus section is not enough on its own: the section still has to
        // lie in the direction of travel.
        .frame(maxWidth: .infinity)
        .focusSection()
    }
}
