# =============================================================================
# demo-community.tape
# TheEngOrg Pitch Demo — Act 1: Community Mode (Drift Detected, Not Prevented)
#
# Usage:  vhs docs/pitch/tapes/demo-community.tape
# Output: demo-community.gif + demo-community-screenshot.png
# Duration: ~45 seconds of terminal action
# =============================================================================

# --- Configuration -----------------------------------------------------------

Output docs/pitch/tapes/demo-community.gif
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

Type "# Community mode — 23 agents, no Sage"
Enter
Sleep 1.5s

# --- Scene: Run /mg-build ---------------------------------------------------

Type "/mg-build WS-DEMO-01"
Enter
Sleep 2s

# --- Simulated agent output: Classification ----------------------------------

Type "echo -e '\033[38;2;74;124;89m[EM]\033[0m    Classifying... ARCHITECTURAL                      0.3s'"
Enter
Sleep 1.5s

Type "echo ''"
Enter
Sleep 0.5s

# --- Simulated agent output: C-Suite review ----------------------------------

Type "echo -e '\033[38;2;138;155;176m[CEO]\033[0m   Business alignment — approved'"
Enter
Sleep 1.2s

Type "echo -e '\033[38;2;46;110;142m[CTO]\033[0m   Technical approach — CONCERN: scope includes auth token rotation, not in spec'"
Enter
Sleep 3s

# >>> KEY MOMENT: CTO flags drift but pipeline continues

Type "echo -e '\033[38;2;74;124;89m[ED]\033[0m    Operational readiness — approved                     7.1s'"
Enter
Sleep 1.5s

Type "echo ''"
Enter
Sleep 0.5s

# --- Simulated agent output: Build phase ------------------------------------

Type "echo -e '\033[38;2;122;92;139m[QA]\033[0m    Writing tests — 18 specs                             5.8s'"
Enter
Sleep 2s

Type "echo -e '\033[38;2;232;232;232m[DEV]\033[0m   Implementing — 14 of 18 tests passing               28.4s'"
Enter
Sleep 2.5s

Type "echo -e '\033[38;2;122;92;139m[QA]\033[0m    Verification — 2 auth-related tests unresolved        3.1s'"
Enter
Sleep 2s

Type "echo ''"
Enter
Sleep 0.5s

# --- Simulated agent output: Review phase -----------------------------------

Type "echo -e '\033[38;2;61;90;107m[SE]\033[0m    Code review — WARNING: auth changes exceed workstream scope'"
Enter
Sleep 2.5s

Type "echo ''"
Enter
Sleep 0.5s

# --- Simulated agent output: Final review — approved WITH concerns ----------

Type "echo -e '\033[38;2;138;155;176m[CEO]\033[0m   Final review — APPROVED WITH CONCERNS                 4.9s'"
Enter
Sleep 2s

Type "echo -e '\033[38;2;74;124;89m[EM]\033[0m    Done — 1 warning unresolved                         49.6s'"
Enter
Sleep 3s

# --- Screenshot: Slide 5 asset (community result) ---------------------------

Screenshot docs/pitch/tapes/demo-community-screenshot.png

Sleep 2s
