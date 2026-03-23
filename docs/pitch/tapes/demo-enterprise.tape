# =============================================================================
# demo-enterprise.tape
# TheEngOrg Pitch Demo — Act 2: Enterprise Mode (Sage Prevents Drift)
#
# Usage:  vhs docs/pitch/tapes/demo-enterprise.tape
# Output: demo-enterprise.gif + demo-enterprise-screenshot.png
# Duration: ~60 seconds of terminal action
# =============================================================================

# --- Configuration -----------------------------------------------------------

Output docs/pitch/tapes/demo-enterprise.gif
Set FontSize 18
Set FontFamily "JetBrains Mono"
Set Width 1200
Set Height 700
Set Padding 24
Set Theme { "name": "TheEngOrg", "black": "#171E28", "red": "#C94D3A", "green": "#4A7C59", "yellow": "#F9A825", "blue": "#2E6E8E", "magenta": "#7A5C8B", "cyan": "#2E8B8B", "white": "#E8E8E8", "brightBlack": "#8A9BB0", "brightRed": "#C94D3A", "brightGreen": "#4A7C59", "brightYellow": "#F9A825", "brightBlue": "#2E6E8E", "brightMagenta": "#7A5C8B", "brightCyan": "#2E8B8B", "brightWhite": "#E8E8E8", "background": "#0D1117", "foreground": "#E8E8E8", "selection": "#1E2A38", "cursor": "#E8E8E8" }
Set TypingSpeed 40ms
Set CursorBlink false

# --- Scene: Project directory ------------------------------------------------

Type "cd ~/demo/acme-api"
Enter
Sleep 1s

Type "# Enterprise mode — Sage active"
Enter
Sleep 1.5s

# --- Scene: Run /mg-build ---------------------------------------------------

Type "/mg-build WS-DEMO-01"
Enter
Sleep 2s

# --- Simulated agent output: Sage intake ------------------------------------

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Intake — reading WS-DEMO-01 spec                     0.4s'"
Enter
Sleep 2s

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Scope assessment — pure engineering, auth layer adjacent'"
Enter
Sleep 1.5s

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  C-Suite routing — CTO only (no business/brand signals)   0.8s'"
Enter
Sleep 2.5s

# >>> KEY MOMENT: Sage selectively routes — skips CEO, CMO, CFO

Type "echo ''"
Enter
Sleep 0.5s

# --- Simulated agent output: CTO rejects ------------------------------------

Type "echo -e '\033[38;2;46;110;142m[CTO]\033[0m   Technical approach — \033[38;2;201;77;58mREJECTED\033[0m: auth token rotation is not in the approved spec'"
Enter
Sleep 3s

# >>> KEY MOMENT: REJECTED, not "concern" — enforcement, not monitoring

Type "echo -e '\033[38;2;46;110;142m[CTO]\033[0m   Decision: scope violation detected — auth changes must be a separate workstream'"
Enter
Sleep 2.5s

Type "echo -e '\033[38;2;74;124;89m[ED]\033[0m    Operational readiness — blocked pending scope resolution   5.2s'"
Enter
Sleep 2s

Type "echo ''"
Enter
Sleep 0.5s

# --- Simulated agent output: Sage challenge ---------------------------------
# >>> THIS IS THE GASP MOMENT

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Drift detected — developer introduced auth token rotation into rate-limiting workstream'"
Enter
Sleep 3s

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Challenge: \"This diverges from the approved spec. Auth token rotation'"
Enter
Sleep 0.5s
Type "echo -e '        requires its own workstream with security review. Why was this included?\"'"
Enter
Sleep 4s

# >>> PAUSE — let the audience absorb the challenge

# --- Simulated agent output: Recovery plan ----------------------------------

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Recovery plan:'"
Enter
Sleep 1s

Type "echo -e '        1. Strip auth changes from WS-DEMO-01'"
Enter
Sleep 1.2s

Type "echo -e '        2. Create WS-DEMO-02: auth token rotation (requires security review)'"
Enter
Sleep 1.2s

Type "echo -e '        3. Resume rate limiting implementation against original spec'"
Enter
Sleep 2s

# --- Simulated agent output: BLOCKED ----------------------------------------

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Decision: \033[38;2;201;77;58mBLOCKED\033[0m — scope violation, recovery plan issued   8.1s'"
Enter
Sleep 4s

# >>> KEY MOMENT: 8.1 seconds total — the number the VC remembers

# --- Screenshot: Slide asset (enterprise result) ----------------------------

Screenshot docs/pitch/tapes/demo-enterprise-screenshot.png

Sleep 2s
