# =============================================================================
# demo-full.tape
# TheEngOrg Pitch Demo — Full 3-Act Demo (<3 minutes)
#
# Act 1: Community mode — drift detected, not prevented (45s)
# Act 2: Enterprise mode — Sage prevents drift (60s)
# Act 3: The Multiplier Effect — leadership routing + summary (30s)
#
# Usage:  vhs docs/pitch/tapes/demo-full.tape
# Output: demo-full.gif + demo-full.mp4
# Duration: ~2:30 of terminal action
# =============================================================================

# --- Configuration -----------------------------------------------------------

Output docs/pitch/tapes/demo-full.gif
Set FontSize 18
Set FontFamily "JetBrains Mono"
Set Width 1200
Set Height 700
Set Padding 24
Set Theme { "name": "TheEngOrg", "black": "#171E28", "red": "#C94D3A", "green": "#4A7C59", "yellow": "#F9A825", "blue": "#2E6E8E", "magenta": "#7A5C8B", "cyan": "#2E8B8B", "white": "#E8E8E8", "brightBlack": "#8A9BB0", "brightRed": "#C94D3A", "brightGreen": "#4A7C59", "brightYellow": "#F9A825", "brightBlue": "#2E6E8E", "brightMagenta": "#7A5C8B", "brightCyan": "#2E8B8B", "brightWhite": "#E8E8E8", "background": "#0D1117", "foreground": "#E8E8E8", "selection": "#1E2A38", "cursor": "#E8E8E8" }
Set TypingSpeed 40ms
Set CursorBlink false

# =============================================================================
# ACT 1 — Community Mode: Drift Detected, Not Prevented
# =============================================================================

Type "cd ~/demo/acme-api"
Enter
Sleep 1s

Type "# Act 1 — Community edition (23 agents, no Sage)"
Enter
Sleep 2s

Type "/mg-build WS-DEMO-01"
Enter
Sleep 2s

# --- Classification ----------------------------------------------------------

Type "echo -e '\033[38;2;74;124;89m[EM]\033[0m    Classifying... ARCHITECTURAL                      0.3s'"
Enter
Sleep 1.5s

Type "echo ''"
Enter
Sleep 0.3s

# --- C-Suite review ----------------------------------------------------------

Type "echo -e '\033[38;2;138;155;176m[CEO]\033[0m   Business alignment — approved'"
Enter
Sleep 1s

Type "echo -e '\033[38;2;46;110;142m[CTO]\033[0m   Technical approach — CONCERN: scope includes auth token rotation, not in spec'"
Enter
Sleep 2.5s

Type "echo -e '\033[38;2;74;124;89m[ED]\033[0m    Operational readiness — approved                     7.1s'"
Enter
Sleep 1.2s

Type "echo ''"
Enter
Sleep 0.3s

# --- Build phase -------------------------------------------------------------

Type "echo -e '\033[38;2;122;92;139m[QA]\033[0m    Writing tests — 18 specs                             5.8s'"
Enter
Sleep 1.5s

Type "echo -e '\033[38;2;232;232;232m[DEV]\033[0m   Implementing — 14 of 18 tests passing               28.4s'"
Enter
Sleep 2s

Type "echo -e '\033[38;2;122;92;139m[QA]\033[0m    Verification — 2 auth-related tests unresolved        3.1s'"
Enter
Sleep 1.5s

Type "echo ''"
Enter
Sleep 0.3s

# --- Review phase ------------------------------------------------------------

Type "echo -e '\033[38;2;61;90;107m[SE]\033[0m    Code review — WARNING: auth changes exceed workstream scope'"
Enter
Sleep 2s

Type "echo ''"
Enter
Sleep 0.3s

# --- Final review: approved WITH concerns ------------------------------------

Type "echo -e '\033[38;2;138;155;176m[CEO]\033[0m   Final review — APPROVED WITH CONCERNS                 4.9s'"
Enter
Sleep 2s

Type "echo -e '\033[38;2;74;124;89m[EM]\033[0m    Done — 1 warning unresolved                         49.6s'"
Enter
Sleep 3s

# --- Screenshot: Community result -------------------------------------------

Screenshot docs/pitch/tapes/demo-full-act1.png

Sleep 2s

# =============================================================================
# TRANSITION: Community -> Enterprise
# =============================================================================

Type "clear"
Enter
Sleep 1s

Type "echo ''"
Enter
Type "echo '  # Now with TheEngOrg Enterprise...'"
Enter
Type "echo '  # Same project. Same drift. Sage is watching.'"
Enter
Type "echo ''"
Enter
Sleep 3s

Type "clear"
Enter
Sleep 1s

# =============================================================================
# ACT 2 — Enterprise Mode: Sage Prevents Drift
# =============================================================================

Type "# Act 2 — Enterprise edition (Sage active)"
Enter
Sleep 1.5s

Type "/mg-build WS-DEMO-01"
Enter
Sleep 2s

# --- Sage intake -------------------------------------------------------------

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Intake — reading WS-DEMO-01 spec                     0.4s'"
Enter
Sleep 1.5s

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Scope assessment — pure engineering, auth layer adjacent'"
Enter
Sleep 1.2s

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  C-Suite routing — CTO only (no business/brand signals)   0.8s'"
Enter
Sleep 2s

Type "echo ''"
Enter
Sleep 0.3s

# --- CTO rejects ------------------------------------------------------------

Type "echo -e '\033[38;2;46;110;142m[CTO]\033[0m   Technical approach — \033[38;2;201;77;58mREJECTED\033[0m: auth token rotation is not in the approved spec'"
Enter
Sleep 2.5s

Type "echo -e '\033[38;2;46;110;142m[CTO]\033[0m   Decision: scope violation detected — auth changes must be a separate workstream'"
Enter
Sleep 2s

Type "echo -e '\033[38;2;74;124;89m[ED]\033[0m    Operational readiness — blocked pending scope resolution   5.2s'"
Enter
Sleep 1.5s

Type "echo ''"
Enter
Sleep 0.3s

# --- Sage challenge (THE GASP MOMENT) ---------------------------------------

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Drift detected — developer introduced auth token rotation into rate-limiting workstream'"
Enter
Sleep 2.5s

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Challenge: \"This diverges from the approved spec. Auth token rotation'"
Enter
Sleep 0.3s
Type "echo -e '        requires its own workstream with security review. Why was this included?\"'"
Enter
Sleep 4s

# --- Recovery plan -----------------------------------------------------------

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Recovery plan:'"
Enter
Sleep 0.8s

Type "echo -e '        1. Strip auth changes from WS-DEMO-01'"
Enter
Sleep 1s

Type "echo -e '        2. Create WS-DEMO-02: auth token rotation (requires security review)'"
Enter
Sleep 1s

Type "echo -e '        3. Resume rate limiting implementation against original spec'"
Enter
Sleep 1.5s

# --- BLOCKED -----------------------------------------------------------------

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Decision: \033[38;2;201;77;58mBLOCKED\033[0m — scope violation, recovery plan issued   8.1s'"
Enter
Sleep 4s

# --- Screenshot: Enterprise result -------------------------------------------

Screenshot docs/pitch/tapes/demo-full-act2.png

Sleep 2s

# =============================================================================
# TRANSITION: Enterprise -> Multiplier
# =============================================================================

Type "clear"
Enter
Sleep 1s

Type "echo ''"
Enter
Type "echo '  # The Multiplier Effect'"
Enter
Type "echo '  # What a 24-agent org does in 8 seconds'"
Enter
Type "echo ''"
Enter
Sleep 3s

Type "clear"
Enter
Sleep 1s

# =============================================================================
# ACT 3 — The Multiplier: Leadership Team Routing + Summary
# =============================================================================

Type "# Act 3 — Leadership routing (Sage selects agents per task)"
Enter
Sleep 1.5s

Type "/mg-leadership-team review WS-DEMO-01"
Enter
Sleep 2s

# --- Sage routing demonstration ----------------------------------------------

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Evaluating WS-DEMO-01 for leadership review           0.3s'"
Enter
Sleep 1.2s

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Signal analysis:'"
Enter
Sleep 0.5s

Type "echo -e '        Engineering scope  — YES  (routing to CTO)'"
Enter
Sleep 0.8s

Type "echo -e '        Business impact    — NO   (skipping CEO)'"
Enter
Sleep 0.8s

Type "echo -e '        Brand/copy         — NO   (skipping CMO)'"
Enter
Sleep 0.8s

Type "echo -e '        Budget impact      — NO   (skipping CFO)'"
Enter
Sleep 0.8s

Type "echo -e '\033[38;2;212;168;75m[SAGE]\033[0m  Routing: CTO only — 1 of 4 C-Suite agents spawned     0.6s'"
Enter
Sleep 2s

Type "echo ''"
Enter
Sleep 0.3s

# --- CTO review --------------------------------------------------------------

Type "echo -e '\033[38;2;46;110;142m[CTO]\033[0m   Reviewing rate limiting approach — sliding window, per-key'"
Enter
Sleep 1.5s

Type "echo -e '\033[38;2;46;110;142m[CTO]\033[0m   Architecture: approved (scope-clean after drift removal)'"
Enter
Sleep 1.5s

Type "echo -e '\033[38;2;74;124;89m[ED]\033[0m    Operational readiness — approved                     3.4s'"
Enter
Sleep 1.2s

Type "echo -e '\033[38;2;74;124;89m[EM]\033[0m    Decision: APPROVED                                   4.3s'"
Enter
Sleep 2s

Type "echo ''"
Enter
Sleep 0.5s

# --- Summary frame -----------------------------------------------------------

Type "echo ''"
Enter
Type "echo -e '  \033[38;2;232;232;232m-----------------------------------------------------------\033[0m'"
Enter
Type "echo -e '  \033[38;2;249;168;37m$5K API cost/mo\033[0m  ->  \033[38;2;74;124;89m30-person engineering velocity\033[0m'"
Enter
Type "echo -e '  \033[38;2;232;232;232m-----------------------------------------------------------\033[0m'"
Enter
Type "echo ''"
Enter
Type "echo -e '  \033[38;2;138;155;176mCommunity:\033[0m  Drift detected at review    (49.6s, full pipeline)'"
Enter
Type "echo -e '  \033[38;2;212;168;75mEnterprise:\033[0m Drift prevented at intake   ( 8.1s, short-circuit)'"
Enter
Type "echo ''"
Enter
Type "echo -e '  \033[38;2;138;155;176mAgents spawned:\033[0m  Community 7  |  Enterprise 2'"
Enter
Type "echo -e '  \033[38;2;138;155;176mTokens used:\033[0m     Community ~48K  |  Enterprise ~12K'"
Enter
Type "echo ''"
Enter
Sleep 6s

# --- Final screenshot --------------------------------------------------------

Screenshot docs/pitch/tapes/demo-full-summary.png

Sleep 2s
