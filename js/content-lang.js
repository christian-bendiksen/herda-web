/* ==========================================================================
   Malm 3 Documentation: Meta, Groups, Getting Started, Language & CLI
   ========================================================================== */

window.MalmDocs = window.MalmDocs || {};

window.MalmDocs.meta = {
  title: "Malm 3",
  subtitle: "A clear, predictable configuration language for your desktop and Linux system",
  version: "Malm 3",
  heroLead:
    "Write clean configuration packs in Malm 3, preview every file change in a plan before it touches disk, and apply updates safely in one step.",
  quickStartCmd: "malm source check && malm deploy --profile default",
};

window.MalmDocs.groups = [
  {
    id: "start",
    label: "Getting Started",
    shortLabel: "Start",
    description: "How Malm 3 works, the everyday workflow, and a complete starter pack.",
  },
  {
    id: "language",
    label: "Language Reference",
    shortLabel: "Language",
    description: "Syntax, types, lists and maps, control flow, file outputs, system config, and built-in helpers.",
  },
  {
    id: "modules",
    label: "Modules & Contracts",
    shortLabel: "Modules",
    description: "Multi-file packs, reusable slots, validation rules, and safety checks.",
  },
  {
    id: "overrides",
    label: "Overrides & Precedence",
    shortLabel: "Overrides",
    description: "Personal ~/.config/malm/ overrides, priority rules, and an interactive simulator.",
  },
  {
    id: "cli",
    label: "CLI & Runtime",
    shortLabel: "CLI",
    description: "Everyday malm commands, inspecting settings, background service, and editor support.",
  },
];

window.MalmDocs.langSections = [
  /* ========================================================================
     1. GETTING STARTED
     ======================================================================== */
  {
    id: "getting-started",
    group: "start",
    badge: "Malm 3",
    title: "Getting Started",
    subtitle: "How Malm packs work, the four-step workflow, and your first working pack",
    lead:
      "Malm 3 lets you describe your desktop configs and system settings in plain, readable files. Before anything on your computer changes, Malm builds a complete preview plan so you can review every edit and apply it all at once.",
    blocks: [
      {
        type: "callout",
        tone: "accent",
        label: "Pack Layout",
        title: "Every Pack Starts with malm.malm",
        text:
          "A Malm pack is a folder with a root file named `malm.malm`. That root file begins with `malm 3`, followed by `authority user` (for personal desktop and home configs) or `authority os` (for system-wide Linux configs). Other `.malm` files imported from the root can organize your modules, themes, machines, and `.tpl` templates cleanly.",
      },
      {
        type: "grid",
        columns: 2,
        cards: [
          {
            title: "Predictable & Self-Contained",
            tag: "Safe Evaluation",
            tone: "accent",
            description:
              "Reading a Malm pack never touches your disk, network, clock, or environment variables. Given the same inputs, it produces the exact same files every time, with built-in safety limits against runaway loops.",
          },
          {
            title: "Preview First, Apply Safely",
            tag: "Safe Commits",
            tone: "ok",
            description:
              "Every change starts as a saved plan you can inspect before applying. Once a plan is built, applying it works offline and swaps files cleanly so an unexpected crash never leaves half-written configs behind.",
          },
          {
            title: "User vs. System Separation",
            tag: "user & os",
            tone: "accent",
            description:
              "`authority user` manages personal configs under your home directory, while `authority os` manages packages, services, and system files. System packs can share read-only facts with user packs through `os_facts`.",
          },
          {
            title: "Base Pack Plus Personal Tweaks",
            tag: "Layered Config",
            tone: "ok",
            description:
              "A shared base pack (like Herda's default pack) layers cleanly with changes you make in the Settings app and your own files in `~/.config/malm/`, without needing to edit the base pack.",
          },
        ],
      },
      {
        type: "steps",
        items: [
          {
            step: 1,
            title: "Write and Check Your Pack",
            description:
              "Create `malm.malm` and your module files, then run a quick check to catch typos, bad types, missing slots, or conflicting settings without modifying any files.",
            code: "malm source check",
            lang: "sh",
          },
          {
            step: 2,
            title: "Lock Your Pack Sources",
            description:
              "Record exact versions of your pack and any imported sources in `malm.lock` so future builds always start from the same files.",
            code: "malm source lock create",
            lang: "sh",
          },
          {
            step: 3,
            title: "Create and Review a Plan",
            description:
              "Build a saved plan combining your pack, Settings changes, and `~/.config/malm/` files, then inspect the exact diff before anything changes.",
            code: "malm plan create --profile default\nmalm plan show",
            lang: "sh",
          },
          {
            step: 4,
            title: "Apply (or Run Interactive Deploy)",
            description:
              "Apply the saved plan safely in one step, or use `malm deploy` to plan, review in an interactive screen, and apply in one guided flow.",
            code: "malm plan apply <PLAN_ID>\n# or run the combined interactive flow:\nmalm deploy --profile default",
            lang: "sh",
          },
        ],
      },
      {
        type: "tabs",
        id: "starter-pack",
        label: "Complete Working Starter Pack",
        tabs: [
          {
            id: "starter-root",
            label: "malm.malm",
            filename: "malm.malm",
            lang: "malm",
            note: "The root file declares `malm 3`, `authority user`, pack metadata, module imports, and selectable profiles.",
            code: `malm 3
authority user

pack "dev.example.desk" {
    target: "~/.config",
    default_profile: "default",
    author: "Herda User",
    malm_version: ">=3.0",
}

import "malm/modules/terminal/terminal.malm"

profile "default" {
    terminal.font_size = 11.5
}

profile "focus" {
    terminal.font_size = 12.5
    terminal.opacity = 1.0
}`,
          },
          {
            id: "starter-module",
            label: "terminal.malm",
            filename: "malm/modules/terminal/terminal.malm",
            lang: "malm",
            note: "Modules declare typed options with valid ranges, color helpers, built-in TOML rendering, and external `.tpl` templates.",
            code: `malm 3

#[notify(signal("alacritty", "USR1"))]
module terminal {
    doc "Terminal emulator appearance and typography."

    option font_family: string = "JetBrains Mono"
    option font_size: float(6.0..=36.0) = 11.0
    option opacity: float(0.5..=1.0) = 0.96
    option accent: color = "#4DA3FF"

    render "terminal/config.toml" as toml {
        font: {
            family: font_family,
            size: font_size,
        },
        window: {
            opacity: opacity,
        },
        colors: {
            accent: accent.hex(),
            border: accent.darken(0.25).hex(),
        },
    }

    render "terminal/theme.conf" as tpl("malm/modules/terminal/theme.tpl") {
        accent: accent,
        font_family: font_family,
        is_solid: opacity >= 1.0,
    }
}`,
          },
          {
            id: "starter-tpl",
            label: "theme.tpl",
            filename: "malm/modules/terminal/theme.tpl",
            lang: "tpl",
            note: "Template paths are relative to the pack root; `{{-` and `-%}` trim extra surrounding whitespace.",
            code: `# Generated by Malm 3
font={{ font_family }}
accent={{ accent.hex() }}
{% if is_solid -%}
opacity=solid
{% else -%}
opacity=translucent
{% endif -%}`,
          },
          {
            id: "starter-cli",
            label: "CLI Commands",
            filename: "workflow.sh",
            lang: "sh",
            note: "Check, lock, plan, review, apply, and trace where an option's value came from.",
            code: `# 1. Check syntax, types, slots, and setting conflicts
malm source check

# 2. Pin pack dependencies in malm.lock
malm source lock create

# 3. Build and preview a plan
malm plan create --profile focus
malm plan show

# 4. Apply the plan (or run \`malm deploy --profile focus\`)
malm plan apply <PLAN_ID>

# 5. See why an option resolved to its final value
malm why terminal.font_size --profile focus`,
          },
        ],
      },
    ],
  },

  /* ========================================================================
     2. SYNTAX, BASIC TYPES & COLORS
     ======================================================================== */
  {
    id: "lexical-primitives",
    group: "language",
    badge: "Syntax & Basics",
    title: "Syntax, Basic Types & Colors",
    subtitle: "Comments, numbers with ranges, strings, colors, and flexible field names",
    lead:
      "Malm 3 uses clean, familiar syntax with nested comments, numbers that check their own ranges, multiline strings with interpolation, and built-in color tools.",
    blocks: [
      {
        type: "code",
        title: "Comments, Numbers & Basic Types",
        filename: "lexical.malm",
        lang: "malm",
        caption:
          "Block comments can nest inside each other. Integers check for overflow on arithmetic (+, -, *, /, %) and support decimal, hex, octal, and binary numbers with `_` visual separators.",
        code: `malm 3
authority user

// Single-line comment
/* Block comments can /* nest inside each other */ cleanly. */

module primitives {
    option enabled: bool = true

    // Whole numbers with optional ranges (inclusive ..= or exclusive ..)
    option outer_gap: int(0..=64) = 8
    option file_mode: int = 0o755
    option bitmask: int = 0b1010_0110
    option capacity: int = 1_000
    option hex_id: int = 0xff_00

    // Decimal numbers with optional ranges and scientific notation
    option scale: float(0.5..=4.0) = 1.25
    option epsilon: float = 1e-3
    option boost: float = 2.5E+4

    // File path string and flexible \`any\` value for free-form data
    option state_dir: path = "~/.local/share/demo"
    option extra_meta: any = { version: 3, tags: ["pure", "checked"] }
}`,
      },
      {
        type: "table",
        caption: "Basic Types",
        headers: ["Type", "Examples / Ranges", "How It Works"],
        rows: [
          ["`bool`", "`true`, `false`", "True or false only; numbers and strings are not treated as booleans."],
          [
            "`int`",
            "`42`, `1_000`, `0xff`, `0o755`, `0b1010`, `int(0..=64)`",
            "64-bit whole number with safe overflow checks (`+`, `-`, `*`, `/`, `%`). Add optional range limits like `int(lo..=hi)`, `int(lo..hi)`, or one-sided bounds.",
          ],
          [
            "`float`",
            "`0.5`, `1_000.25`, `1e-3`, `2.5E+4`, `float(0.0..=1.0)`",
            "64-bit decimal number with optional range limits like `float(lo..=hi)`.",
          ],
          [
            "`string`",
            "`\"hi ${name}\"`, `\"\"\"...\"\"\"`, `r#\"...\"#`",
            "Text with `${expr}` interpolation, automatically dedented multiline strings, and raw strings.",
          ],
          [
            "`color`",
            "`\"#4DA3FF\"`, `\"rgb(77,163,255)\"`, `color.hsl(...)`",
            "Validated color value with built-in lightening, darkening, mixing, and contrast helpers. Color methods also work directly on quoted color strings.",
          ],
          [
            "`path`",
            "`\"~/.config/app\"`, `\"relative/file\"`",
            "Validated file path string; skipped by `malm export` unless you pass `--include-paths`.",
          ],
          [
            "`any`",
            "`{ k: 1 }`, `[1, \"a\"]`",
            "Flexible JSON-compatible type for free-form data and host `os_facts`.",
          ],
        ],
      },
      {
        type: "tabs",
        id: "strings-colors-wire",
        label: "Strings, Colors & Field Names",
        tabs: [
          {
            id: "tab-strings",
            label: "Strings & Interpolation",
            filename: "strings.malm",
            lang: "malm",
            note: "Single-line strings stay on one line. Multiline `\"\"\"` trims shared leading indentation and whitespace on the closing line. Raw strings (`r\"...\"` or `r#\"...\"#`) keep backslashes and `${...}` literal.",
            code: `malm 3
authority user

module text_examples {
    let app = "herda-shell"
    let port = 8443

    // Single-line string with \${expr} interpolation and escapes:
    // \\n \\t \\r \\0 \\\\ \\" \\$ \\u{1..6 hex digits}
    let header = "Service: \${app} (port \${port}) \\u{2713}"

    // Multiline string (shared leading indentation is stripped automatically)
    let launcher = """
        #!/usr/bin/env sh
        # Escape \\$ to keep a literal shell variable like $HOME
        exec \${app} --home "\\$HOME" --port \${port}
    """

    // Raw strings keep backslashes and \${...} untouched
    let regex_simple = r"^[a-z0-9_-]+$"
    let regex_quoted = r#"pattern="quoted \\d+" with \${literal}"#

    render "demo/launcher.sh" as text {
        launcher
    }
}`,
          },
          {
            id: "tab-colors",
            label: "Colors & Palette Math",
            filename: "colors.malm",
            lang: "malm",
            note: "All color operations work both through `color.<fn>(c, ...)` and directly as methods on `color` values or quoted color strings.",
            code: `malm 3
authority user

module palette_ops {
    // Quoted hex and rgb() strings work wherever a \`color\` is expected
    option accent: color = "#4DA3FF"
    option canvas: color = "rgb(24, 29, 40)"

    // Explicit color constructors
    let parsed = color.parse("rgba(77, 163, 255, 0.9)")
    let slate = color.rgb(24, 29, 40)
    let sky = color.hsl(212.0, 0.95, 0.65)

    // Adjust brightness, saturation, opacity, and contrast directly
    let hover = accent.lighten(0.08).hex()
    let muted = "#4DA3FF".desaturate(0.35).mix(slate, 0.4).hex()
    let translucent = accent.alpha(0.18).rgba()
    let ratio = accent.contrast_ratio(canvas)
    let high_contrast_ink = if canvas.is_dark() { "#E8ECF4" } else { "#141A24" }

    render "demo/palette.json" as json {
        accent: accent.hex(),
        hover: hover,
        muted: muted,
        translucent: translucent,
        contrast: ratio.round(),
        ink: high_contrast_ink,
    }
}`,
          },
          {
            id: "tab-wire",
            label: "Field Names & #[wire]",
            filename: "wire.malm",
            lang: "malm",
            note: "Names in Malm use `snake_case` (letters, digits, and underscores). Option names, `Map::get`, `in`, and Settings customizations automatically match `snake_case` and `kebab-case`. Use `#[wire(...)]` when an output file requires a specific spelling.",
            code: `malm 3
authority user

#[wire(tag = "kind", rename_all = "camelCase")]
enum WindowRule {
    FloatCentered,
    PinWorkspace {
        #[wire("workspaceId")]
        workspace_id: int(1..=8),
    },
}

struct DisplayPrefs {
    #[wire("refreshRateHz")]
    refresh_rate: int(30..=360) = 120,
    fractional_scale: float(1.0..=3.0) = 1.5,
}

module display {
    option prefs: DisplayPrefs = { refresh_rate: 120, fractional_scale: 1.5 }
    option rule: WindowRule = WindowRule::PinWorkspace { workspace_id: 2 }

    // Map lookups match both snake_case and kebab-case keys automatically
    let table = { "outer-gap": 6, inner_gap: 4 }
    let outer = table.get("outer_gap").unwrap_or(0) // resolves to 6

    render "display/prefs.json" as json {
        prefs: prefs,
        rule: rule,
        outer: outer,
    }
}`,
          },
        ],
      },
      {
        type: "callout",
        tone: "changed",
        label: "Tips for Newcomers",
        title: "Write Colors and Durations as Quoted Strings",
        text:
          "Always write colors inside quotes like `\"#4DA3FF\"`, `\"rgb(...)\"`, or `\"rgba(...)\"`, or build them with `color.parse(...)`, `color.rgb(...)`, or `color.hsl(...)`. Bare `#4DA3FF` tokens without quotes are rejected by Malm. Likewise, numbers do not take unit suffixes: write durations like `\"2h\"` or `\"7d\"` as strings, and counts like pixels or milliseconds as plain `int` or `float` values.",
      },
    ],
  },

  /* ========================================================================
     3. LISTS, MAPS, STRUCTS, ENUMS & UPDATING COLLECTIONS
     ======================================================================== */
  {
    id: "types-collections",
    group: "language",
    badge: "Data & Updates",
    title: "Lists, Maps, Structs, Enums & Updating Collections",
    subtitle: "Structured data with validation rules, clear `=` replacement, and targeted collection edits",
    lead:
      "Malm 3 removes guesswork around merging settings: `=` always replaces the entire value, while `.patch`, `.insert`, `.extend`, `.remove`, `.push`, and `#[order(...)]` make targeted updates to maps and lists explicit and easy to read.",
    blocks: [
      {
        type: "tabs",
        id: "compound-types",
        label: "Structured Types & Updating Collections",
        tabs: [
          {
            id: "tab-structs-enums",
            label: "Structs, Enums & Maps",
            filename: "types.malm",
            lang: "malm",
            note: "There is no separate Set type: use `List<T>` with `.unique()` when you want unique entries. Curly braces `{ ... }` create a map everywhere except inside function, loop, `if`, closure, and `match` bodies.",
            code: `malm 3
authority user

// Type alias for readability
type KeyBinds = Map<string, string>

// Named struct with \`where { ... }\` validation rules
struct PaceWindows {
    quiet: int(5..=1440) = 60,
    standard: int(1..=240) = 15,
} where {
    standard <= quiet,
}

// Enum with plain, tuple, and named-field variants
enum DesktopAction {
    Close,
    Spawn(string),
    FocusColumn { index: int(1..=12), wrap: bool = false },
}

module workspace_types {
    // Inline string choices, fixed tuple, inline record, List, and Map
    option pace_mode: enum<quiet|normal|batched> = "normal"
    option resolution: (int, int) = (2560, 1440)
    option margins: { top: int = 6, bottom: int = 44 } = { top: 6, bottom: 44 }
    option windows: PaceWindows = { quiet: 60, standard: 15 }
    option tags: List<string> = ["herda", "wayland"]
    option binds: KeyBinds = {
        "close": "win-close",
        "help": "show-help",
        "quit": "session-exit",
    }

    // Maps support quoted keys, dynamic (key) expressions, shorthand, and ..spread
    let dyn_key = "lock"
    let base_opts = { repeat_rate: 35, repeat_delay: 250 }
    let merged_opts = { ..base_opts, (dyn_key): "swaylock", pace_mode }

    render "workspace/types.json" as json {
        pace_mode: pace_mode,
        resolution: resolution,
        margins: margins,
        windows: windows,
        merged_opts: merged_opts,
    }
}`,
          },
          {
            id: "tab-algebra",
            label: "Replacing (=) vs. Editing Collections",
            filename: "algebra.malm",
            lang: "malm",
            note: "In layers, modules, overrides, and local `let mut` variables, use `=` to replace an entire value, or call collection methods to merge, add, remove, or position specific entries.",
            code: `malm 3
authority user

module compositor {
    option gap: int = 8
    option input: Map<string, any> = {
        repeat_rate: 30,
        repeat_delay: 250,
        tap_to_click: true,
    }
    option binds: Map<string, string> = {
        "close": "win-close",
        "help": "show-help",
        "quit": "session-exit",
    }
    option startup: List<string> = ["portal", "shell"]
}

#[priority(160)]
layer "herda-plate" {
    // \`=\` always replaces the whole value instead of guessing whether to merge
    compositor.gap = 6

    // Merge nested fields or update/remove individual map keys
    compositor.input.patch({ repeat_rate: 45 })
    compositor.binds.insert("term", "spawn,kitty")
    compositor.binds.extend({ "lock": "session-lock" })
    compositor.binds.remove("help")
    compositor.binds.remove_all(["quit"])

    // Add list items at exact positions with #[order(...)]
    #[order(first)]
    compositor.startup.push("dbus-env")

    #[order(after = "portal")]
    compositor.startup.push("notifications")

    compositor.startup.push_front("early-init")
    compositor.startup.prepend(["env-prep"])
    compositor.startup.extend(["idle-daemon"])
}`,
          },
        ],
      },
      {
        type: "table",
        caption: "Updating Values, Maps & Lists",
        headers: ["Operation", "Works On", "What It Does"],
        rows: [
          ["`path = expr`", "Any option", "Replaces the entire value. Malm stops with an error if two settings at the same priority disagree."],
          ["`.patch({ ... })`", "`Map` / `struct`", "Deeply merges nested keys while leaving sibling keys untouched."],
          ["`.insert(k, v)`", "`Map`", "Sets a single key; Malm stops with an error if two writes to the same key at the same priority disagree."],
          ["`.extend(other)`", "`Map` / `List`", "Adds top-level keys to a map or appends multiple items to a list."],
          ["`.remove(x)` / `.remove_all([...])`", "`Map` / `List`", "Removes matching keys from a map or matching items from a list cleanly."],
          ["`.push(v)` / `.push_front(v)` / `.prepend(xs)`", "`List`", "Appends or prepends items; `.push` honors `#[order(...)]`."],
          [
            "`#[order(...)]`",
            "List `.push` / `.extend`",
            "Controls exact placement: `first`, `before`, `after`, `last`, an integer `N` (negative numbers place near the front), `before = \"id\"`, or `after = \"id\"` (matches a string item or a map's `id`/`name` field).",
          ],
        ],
      },
      {
        type: "callout",
        tone: "accent",
        label: "Tips for Newcomers",
        title: "Clean, Explicit Patterns in Malm 3",
        text:
          "Malm 3 prefers explicit readability over hidden shorthand: use `None` instead of `null`, handle optional values with `match`, `if let`, or `.unwrap_or(...)` instead of `?` or `??`, chain methods with `.` instead of pipe operators, spread maps with `{ ..base }`, write attributes as `#[...]`, and pass a single key to `map.get(key)` followed by `.unwrap_or(fallback)`.",
      },
    ],
  },

  /* ========================================================================
     4. EXPRESSIONS, CONTROL FLOW, FUNCTIONS & OPTIONAL VALUES
     ======================================================================== */
  {
    id: "expressions-control-flow",
    group: "language",
    badge: "Logic & Functions",
    title: "Expressions, Control Flow, Functions & Optional Values",
    subtitle: "Operator order, pattern matching, loops, comprehensions, closures, and Option/Result",
    lead:
      "Every expression in Malm 3 is pure and predictable. Pattern matching with `if let`, `&& let`, and `match` works the same way across expressions, modules, layers, outputs, comprehensions, and `.tpl` templates.",
    blocks: [
      {
        type: "table",
        caption: "Operator Precedence (Lowest to Highest)",
        headers: ["Level", "Operators / Forms", "Notes"],
        rows: [
          ["1 (Lowest)", "`..`, `..=`", "Exclusive and inclusive integer ranges."],
          ["2", "`||`", "Logical OR (stops early if the left side is true)."],
          ["3", "`&&`, `&& let pat = expr`", "Logical AND and chained `let` patterns inside `if` and `while`."],
          ["4", "`==`, `!=`, `<`, `<=`, `>`, `>=`, `in`", "`in` checks list membership, map keys (matching `snake_case` and `kebab-case`), or substrings."],
          ["5", "`++`", "Joins two strings or two lists."],
          ["6", "`+`, `-`", "Checked addition and subtraction (`+` also joins strings)."],
          ["7", "`*`, `/`, `%`", "Checked multiplication, division, and remainder."],
          ["8", "`!`, `-` (unary)", "Logical NOT and numeric negation."],
          ["9", "`.field`, `.0`, `[i]`, `(args)`, `.method(...)`", "Field lookup, tuple index, indexing, function calls, and method calls."],
          [
            "10 (Highest)",
            "Literals, `Some`/`None`/`Ok`/`Err`, macros, paths `a::b`, tuples, lists, maps, comprehensions, closures, `if`, `match`",
            "Basic expressions (there is no postfix `?` operator).",
          ],
        ],
      },
      {
        type: "tabs",
        id: "control-flow-tabs",
        label: "Loops, Pattern Matching & Functions",
        tabs: [
          {
            id: "tab-bindings-loops",
            label: "Variables, Loops & Comprehensions",
            filename: "loops.malm",
            lang: "malm",
            note: "`let mut` can only be used inside a function, so functions stay self-contained from the outside. `for` loops work on `List`, `Range`, `Map` (giving `(k, v)`), `Tuple`, and `scopes.workpiece` / `scopes.app`.",
            code: `malm 3
authority user

const MAX_RETRIES: int = 4

fn split_chunks(total_ms: int) -> List<string> {
    let mut parts = []
    let mut rem = total_ms

    while rem >= 1000 {
        parts.push("1s")
        rem = rem - 1000
    }
    if rem > 0 {
        parts.push("\${rem}ms")
    }
    parts
}

fn first_even(xs: List<int>) -> Option<int> {
    let mut i = 0
    while let Some(v) = xs.get(i) {
        if v % 2 == 0 {
            return Some(v)
        }
        i = i + 1
    }
    None
}

module loop_demo {
    option raw_ids: List<int> = [1, 2, 3, 4, 5, 6]

    // List and Map comprehensions (also support \`if let\` and \`&& let\`)
    let evens = [for x in raw_ids if x % 2 == 0 { x * 10 }]
    let keyed = {for (idx, val) in evens.enumerate() { "slot_\${idx}": val }}

    render "demo/loops.json" as json {
        chunks: split_chunks(2400),
        first: first_even(raw_ids),
        evens: evens,
        keyed: keyed,
    }
}`,
          },
          {
            id: "tab-match-chains",
            label: "if let, && let & Exhaustive match",
            filename: "matching.malm",
            lang: "malm",
            note: "`match` makes sure you handle every variant of an `enum`, and supports `if` guards, number ranges, `|` alternatives, `@` bindings, and tuple, list, map, and struct destructuring.",
            code: `malm 3
authority user

enum PaceLevel {
    Off,
    Quiet(int),
    Custom { label: string, hold_ms: int = 2000 },
}

fn describe(level: PaceLevel, override_ms: Option<int>) -> string {
    // Combine multiple pattern checks in one \`if let\` with \`&& let\`
    if let PaceLevel::Custom { label, .. } = level && let Some(ms) = override_ms {
        return "\${label} (override \${ms}ms)"
    }

    match level {
        PaceLevel::Off => "off",
        PaceLevel::Quiet(mins @ 1..=30) => "short quiet (\${mins}m)",
        PaceLevel::Quiet(mins @ 31..=1440) if mins >= 60 => "deep quiet (\${mins}m)",
        PaceLevel::Quiet(mins) => "quiet (\${mins}m)",
        PaceLevel::Custom { label, hold_ms } => "\${label} (\${hold_ms}ms)",
    }
}

fn inspect_list(xs: List<string>) -> string {
    match xs {
        [] => "empty",
        [only] => "single: \${only}",
        [first, ..middle, last] => "\${first} -> (\${middle.len()} more) -> \${last}",
    }
}`,
          },
          {
            id: "tab-fns-macros",
            label: "Functions, Closures, Macros & Result",
            filename: "functions.malm",
            lang: "malm",
            note: "Functions support optional type annotations, default parameter values, and positional or named arguments. Built-in macros help with checks, warnings, text formatting, and work-in-progress placeholders.",
            code: `malm 3
authority user

fn badge(label: string, tone: string = "accent", compact: bool = false) -> string {
    let body = if compact { label.upper() } else { label }
    format!("[{0}] {1}", tone, body)
}

module fn_demo {
    option timeout_ms: int = 5000
    option low_timeout_ms: int = 3000
    option optional_note: Option<string> = "wrapped automatically into Some"

    // Mix positional and named arguments
    let tag = badge("Malm 3", compact: true)

    // Short closures: |x| expr, || expr, or |x| { ... }
    let doubled = [1, 2, 3, 4].filter(|n| n > 1).map(|n| n * 2)

    // Handle Result<T, E> cleanly with .map() and .unwrap_or()
    let parsed: Result<int, string> = "42".parse_int()
    let port = parsed.map(|n| n + 8000).unwrap_or(8080)

    // Built-in macros: assert!, warn!, format!, todo!, unreachable!
    assert!(timeout_ms > 0, "timeout_ms must be positive")
    if low_timeout_ms > timeout_ms {
        warn!("low_timeout_ms exceeds timeout_ms")
    }

    render "demo/fn.json" as json {
        tag: tag,
        doubled: doubled,
        port: port,
        note: optional_note,
    }
}`,
          },
        ],
      },
      {
        type: "callout",
        tone: "ok",
        label: "Optional Values",
        title: "Working with Option<T> and None",
        text:
          "Malm 3 has no `null` keyword. Instead, optional values use `Option<T>` with `Some(value)` or `None`. Assigning a plain value directly to an `Option<T>` option wraps it in `Some(...)` for you. When writing files, `Some(v)` outputs as `v`, while `None` becomes `null` in JSON and is skipped cleanly in KDL, TOML, and INI files.",
      },
    ],
  },

  /* ========================================================================
     5. PACKS, MODULES, FILE OUTPUTS, TEMPLATES & SYSTEM CONFIG
     ======================================================================== */
  {
    id: "declarations-outputs-os",
    group: "language",
    badge: "Configs & System",
    title: "Packs, Modules, File Outputs, Templates & System Config",
    subtitle: "Organizing packs, generating config files in seven formats, `.tpl` templates, and `authority os`",
    lead:
      "Use the same clear language to configure both personal apps (`authority user`) and whole Linux systems (`authority os`), while keeping user files and system settings cleanly separated.",
    blocks: [
      {
        type: "tabs",
        id: "domain-decls-outputs",
        label: "User Packs, File Outputs & Templates",
        tabs: [
          {
            id: "tab-decls",
            label: "Pack, Axes, Slots & Scopes",
            filename: "declarations.malm",
            lang: "malm",
            note: "Shows `pack`, `axis`, `slot`/`impl`, `module`, `layer`, `machine`, `profile`, `workpiece`/`app` scopes, and common `#[...]` attributes.",
            code: `malm 3
authority user

pack "dev.herda.example" {
    target: "~/.config",
    default_machine: "laptop-2k",
    default_profile: "default",
    malm_version: ">=3.0",
}

axis look {
    default: "herda",
    options: ["herda", "plain"],
    doc: "Visual look axis",
}

slot compositor max = 1 {
    option outer_gap: int(0..=64) = 8
}

#[notify(compositor_reload)]
module herda_compositor {
    doc "Wayland compositor layout and gaps."
    impl compositor;

    #[scope(workpiece)]
    #[sentence("Window gap is {value} px")]
    option outer_gap: int(0..=64) = 8

    #[machine_only]
    option output_scale: float(1.0..=3.0) = 1.5

    #[sensitive]
    option sync_token: Option<string>

    #[deprecated("Use outer_gap instead")]
    option gap: int = 8

    render "herda-compositor/config.json" as json using theme {
        outer_gap: outer_gap,
        output_scale: output_scale,
        theme_name: theme.name,
        accent: theme.accent,
    }
}

#[priority(160)]
layer "herda-plate" if true {
    herda_compositor.outer_gap = 6
}

machine "laptop-2k" {
    herda_compositor.output_scale = 1.25
}

profile "focus" {
    herda_compositor.outer_gap = 4

    workpiece "Thesis" {
        herda_compositor.outer_gap = 0
    }
}`,
          },
          {
            id: "tab-outputs",
            label: "Multi-Format Outputs",
            filename: "outputs.malm",
            lang: "malm",
            note: "`render` writes `json`, `kdl`, `toml`, `ini`, `xml`, `text`, and `tpl(\"...\")` files (with optional `using theme`), alongside static `file`, `dir`, and `link` entries.",
            code: `malm 3
authority user

module multi_format {
    option gap: int = 6
    option debug: bool = false
    option items: List<int> = [1, 2, 3]

    // JSON with automatic key casing: "preserve" | "snake" | "camel" | "kebab"
    render "app/settings.json" as json(case: "camel") {
        outer_gap: gap,
        debug_mode: debug,
    }

    // Native KDL output with nodes, properties, if blocks, and for loops
    render "app/layout.kdl" as kdl {
        layout(gap: gap) {
            if debug {
                diagnostics(true)
            }
            for n in items {
                column(n)
            }
        }
    }

    // TOML, INI, XML, and plain text
    render "app/config.toml" as toml { layout: { gap: gap } }
    render "app/config.ini" as ini { General: { gap: gap } }
    render "app/fonts.xml" as xml { fontconfig: { gap: gap } }
    render "app/readme.txt" as text { "Gap is \${gap}px\\n" }

    // Copy static files, copy folders, or create symlinks
    file "app/helper.sh" from = "assets/helper.sh" mode = 0o755
    dir "app/themes" from = "assets/themes"
    link "app/current.toml" to = "config.toml"
}`,
          },
          {
            id: "tab-tpl",
            label: "External .tpl Templates",
            filename: "config.tpl",
            lang: "tpl",
            note: "Single `{}` braces and shell variables like `$HOME` or `${SHELL}` pass through untouched, making CSS, shell scripts, and config files easy to write.",
            code: `{# Comments are stripped from the rendered file #}
{% let border = accent.darken(0.2).hex() -%}
/* Theme: {{ theme.name }} */
:root {
    --accent: {{ accent.hex() }};
    --border: {{ border }};
}

{% if let Some(user_note) = note && !user_note.is_empty() -%}
/* Note: {{- user_note -}} */
{% elif is_dark -%}
/* Night surface */
{% else -%}
/* Day surface */
{% endif -%}

{% for (idx, item) in items.enumerate() -%}
# Entry {{ idx }}: $HOME stays verbatim, \${SHELL} stays verbatim
item_{{ idx }} = "{{ item }}"
{% endfor -%}`,
          },
        ],
      },
      {
        type: "table",
        caption: "Attributes (`#[...]`) Reference",
        headers: ["Attribute", "Applies To", "What It Does"],
        rows: [
          ["`#[priority(N)]`", "Layers, blocks, statements", "Sets an explicit priority number (any integer) to control which value wins."],
          ["`#[default]` / `#[force]`", "Option writes", "Shortcuts for `#[priority(10)]` (soft fallback) and `#[priority(1000)]` (strong override that locks the option in Settings)."],
          ["`#[order(...)]`", "List `.push` / `.extend`", "Sets list placement: `first`, `before`, `after`, `last`, an integer `N`, `before = \"id\"`, or `after = \"id\"`."],
          [
            "`#[notify(...)]`",
            "Module or output",
            "Reload hook after applying changes: `none`, `compositor_reload`, `compositor_theme_reload`, `portal_restart`, `greeter_sync`, `font_cache_refresh`, `units_reload([...])`, `units_restart([...])`, `signal(\"proc\", \"SIG\")`, or a custom tag.",
          ],
          ["`#[scope(workpiece | app)]`", "`option`", "Allows an option to be customized per workpiece or per application."],
          ["`#[scope_only(workpiece | app)]`", "`option`", "Requires the option to be set only inside the named scope (stops with an error if set globally)."],
          ["`#[machine_only]`", "`option`", "Keeps hardware or machine settings out of `workpiece` and `app` scopes."],
          ["`#[sentence(\"...\")]` / `#[sentence_prefix(\"...\")]`", "`option` / `module`", "Plain-English wording shown in the Settings UI using `{parent}`, `{value}`, `{workpiece}`, and `{app}`."],
          ["`#[sensitive]`", "`option`", "Hides secret values as `\"<redacted>\"` in `resolve`, `why`, and logs, and skips them during `malm export`."],
          ["`#[wire(\"name\")]` / `#[wire(tag = \"...\", rename_all = \"...\")]`", "Fields / enums", "Sets exact key or tag names written to output files (`snake_case`, `camelCase`, `kebab-case`, `preserve`)."],
          ["`#[deprecated]` / `#[deprecated(\"msg\")]`", "`option` / items", "Prints a helpful warning whenever a deprecated option or item is still used."],
        ],
      },
      {
        type: "prose",
        html:
          "<p><strong>System Configuration (<code>authority os</code>):</strong> System packs in <code>/usr/share/herda/distro-modules/</code> and <code>/etc/herda/system.malm</code> describe an entire Linux installation. They support parameterized modules instantiated with <code>use mod(args)</code>, custom package builds with <code>overlay package</code>, derived system images with <code>system ... overlay</code>, 25 built-in system resource types, and <code>export fact</code> to publish read-only values into <code>/run/herda/os-facts.json</code> (available to user packs as <code>os_facts</code>).</p>",
      },
      {
        type: "code",
        title: "System Configuration: Slots, Package Overlays, Resources & Shared Facts",
        filename: "system.malm",
        lang: "malm",
        badge: "authority os",
        code: `malm 3
authority os

pub slot kernel(min: 1, max: 1) {
    pub pkg: string,
    pub cmdline: List<string> = [],
}

pub module kernel(pkg: string = "linux") impl slot kernel {
    pub pkg = pkg
    packages.push(pkg)
}

// Custom package build overlay
overlay package "gtk4" {
    source = {
        url: "https://download.gnome.org/sources/gtk/4.18/gtk-4.18.0.tar.xz",
        sha256: "0000pinned",
    }
    patches = [
        { path: "patches/gtk4-herda-csd.patch", sha256: "1111pinned" },
    ]
    build = BuildSystem::Meson {
        flags: ["-Dwayland-backend=true", "-Dbuild-tests=false"],
    }
    abi_gate = { soname: "libgtk-4.so.1", require_compat: true }
    staging = StagingMode::SideBySide
}

system release {
    use kernel("linux");
    hostname = "herda"
    packages.extend(["glibc", "systemd"])

    sysgroup "greeter" { gid: 970 }
    sysuser "greeter" {
        uid: 970,
        groups: ["video", "input"],
        shell: "/usr/bin/nologin",
        home: "/var/lib/greeter",
    }
    tmpfile "/run/herda" { type: "d", mode: "0755", user: "root", group: "root" }
    link "/etc/resolv.conf" to "/run/systemd/resolve/stub-resolv.conf"

    systemd::service "herda-greeter.service" {
        unit: { description: "Herda Greeter" },
        service: { exec_start: "/usr/bin/herda-greeter" },
        enable: true,
    }
    dbus::service "org.herda.System" { exec: "/usr/bin/herda-sysd", user: "root" }
    portal::backend "herda" {
        dbus_name: "org.freedesktop.impl.portal.desktop.herda",
        interfaces: ["org.freedesktop.impl.portal.Settings"],
    }
    nft::table "herda_fw" {
        family: "inet",
        chains: { input: ["type filter hook input priority 0; policy drop;"] },
    }
    capsule "api" { unit: "api.service", command: ["/usr/bin/api"] }
    contract "display" { protocol: "wayland" }
}

// Derived system image extending \`release\`
system live overlay release {
    use kernel("linux-zen");
    hostname = "herda-live"
    packages.extend(["ripgrep", "fd"])

    pam::service "herda-lock" {
        auth: [PamRule::Include("login")],
        account: [PamRule::Include("login")],
    }
    polkit::rule "49-herda-live-installer" {
        action: "org.herda.install",
        subject_user: "live",
        require_local_active: true,
        result: PolkitResult::Yes,
    }

    // Share read-only facts with user packs via /run/herda/os-facts.json
    export fact "kernel_pkg" = slots.kernel.pkg
    export fact "is_live_medium" = true
}`,
      },
      {
        type: "grid",
        columns: 3,
        cards: [
          {
            title: "Systemd Units (9)",
            tag: "systemd::*",
            tone: "accent",
            description:
              "systemd::service, systemd::timer, systemd::socket, systemd::path, systemd::dropin, systemd::user_service, systemd::user_dropin, systemd::enable, systemd::disable.",
          },
          {
            title: "Accounts & Identity (4)",
            tag: "Users & Groups",
            tone: "accent",
            description:
              "sysuser, sysgroup, user, and group declarations with UID/GID, home directory, login shell, and supplementary groups.",
          },
          {
            title: "Files & Links (4)",
            tag: "Filesystem",
            tone: "accent",
            description:
              "tmpfile, dir (with octal mode, user, and group), file, and link \"/dest\" to \"/target\" declarations.",
          },
          {
            title: "Auth & Policy (3)",
            tag: "PAM & Polkit",
            tone: "changed",
            description:
              "pam::service (typed PamRule stacks), polkit::action, and polkit::rule (typed PolkitResult).",
          },
          {
            title: "Desktop Services (2)",
            tag: "D-Bus & Portals",
            tone: "ok",
            description:
              "dbus::service activation entries and portal::backend XDG Desktop Portal registrations.",
          },
          {
            title: "Firewall & Isolation (3)",
            tag: "Security",
            tone: "ok",
            description:
              "nft::table declarative nftables firewall rules, capsule sandboxed services, and contract protocol declarations.",
          },
        ],
      },
      {
        type: "callout",
        tone: "accent",
        label: "Clean Boundaries",
        title: "User Packs and System Packs Stay Separate",
        text:
          "A user pack (`authority user`) cannot declare `system` blocks, package overlays, OS resources, or `export fact`. Likewise, a system pack (`authority os`) cannot write dotfiles into `$HOME` or trigger desktop session reloads. When a user config needs information from the OS, the system pack publishes it with `export fact` and the user pack reads it from `os_facts`.",
      },
    ],
  },

  /* ========================================================================
     6. BUILT-IN CONTEXTS, HELPERS & METHODS
     ======================================================================== */
  {
    id: "stdlib-methods",
    group: "language",
    badge: "Built-in Helpers",
    title: "Built-in Contexts, Helpers & Methods",
    subtitle: "Ready-to-use namespaces and value methods for colors, text, paths, math, JSON, lists, and maps",
    lead:
      "Every built-in helper and method in Malm 3 works purely on the values you pass in, with no disk or network calls, so the same code behaves predictably in both `authority user` and `authority os` packs.",
    blocks: [
      {
        type: "grid",
        columns: 2,
        cards: [
          {
            title: "theme",
            tag: "Active Theme",
            tone: "accent",
            description:
              "Current theme context exposed inside packs and `render ... using theme`: `theme.name`, `theme.mode`, `theme.is_light`, `theme.look` (`Option<string>`), `theme.accent`, `theme.colors`, and palette tokens.",
          },
          {
            title: "scopes",
            tag: "Active Scopes",
            tone: "accent",
            description:
              "Complete snapshots of active scoped settings: loop over `scopes.workpiece` and `scopes.app` (each entry includes full module values with that scope's edits applied) or inspect `scopes.active`.",
          },
          {
            title: "os_facts",
            tag: "System Facts",
            tone: "ok",
            description:
              "Read-only `Map<string, any>` loaded from `/run/herda/os-facts.json` (defaults to `{}` when absent), populated by `export fact` in `authority os` packs.",
          },
          {
            title: "slots",
            tag: "Slot Exports",
            tone: "ok",
            description:
              "Reads `pub` values exported by the active module implementing a typed `slot` (for example `slots.kernel.pkg` inside a `system` block).",
          },
        ],
      },
      {
        type: "table",
        caption: "Built-in Helper Namespaces (6)",
        headers: ["Namespace", "Functions", "Notes"],
        rows: [
          [
            "`color`",
            "`parse`, `rgb`, `hsl`, `hex`, `hex_alpha`, `strip`, `rgba`, `alpha`, `mix`, `lighten`, `darken`, `saturate`, `desaturate`, `hue`, `ring`, `complement`, `invert`, `grayscale`, `contrast`, `contrast_ratio`, `is_dark`, `is_light`, `luminance`, `oklab`, `r`, `g`, `b`, `a`, `omarchy_mix`, `resolve_palette`",
            "Every color transform and query also works directly as a method on `color` values and quoted color strings.",
          ],
          ["`shell`", "`quote`, `join`", "Safely quotes shell arguments and joins command lists."],
          ["`math`", "`round`, `floor`, `ceil`, `trunc`, `sqrt`, `pow`, `signum`, `abs`, `min`, `max`, `clamp`", "Standard math helpers for `int` and `float`."],
          ["`path`", "`join`, `parent`, `file_name`, `stem`, `extension`, `with_extension`, `normalize`, `is_absolute`, `strip_prefix`", "Pure path string helpers (never touches the host filesystem)."],
          ["`json`", "`parse`, `stringify`, `stringify_pretty`", "`json.parse` returns `Result<any, string>`."],
          ["`hash`", "`sha256`", "Returns a lowercase hex SHA-256 fingerprint of a text string."],
        ],
      },
      {
        type: "table",
        caption: "Built-in Value Methods",
        headers: ["Type", "Methods"],
        rows: [
          [
            "`string`",
            "`len`, `is_empty`, `trim`, `trim_start`, `trim_end`, `upper`, `lower`, `strip_prefix`, `strip_suffix`, `lines`, `chars`, `split`, `split_once`, `rsplit_once`, `split_whitespace`, `repeat`, `slice`, `find`, `replace`, `contains`, `starts_with`, `ends_with`, `parse_int` (`-> Result`), `parse_float` (`-> Result`), `to_float`, `to_string`, `to_snake_case`, `to_kebab_case`, `to_camel_case`, `indent`, `dedent`, plus all color methods.",
          ],
          [
            "`int` / `float` / `bool`",
            "`to_string`, `to_int`, `to_float`, `abs`, `round`, `min`, `max`, `clamp`, plus `to_hex` and `to_octal` on `int`.",
          ],
          [
            "`Range`",
            "`len`, `is_empty`, `contains`, `collect`, `rev`, plus all `List` methods.",
          ],
          [
            "`List<T>`",
            "`len`, `is_empty`, `contains`, `join`, `compact`, `reverse`, `sort`, `sort_by`, `sort_by_key`, `unique`, `first`, `last`, `get`, `push`, `extend`, `push_front`, `prepend`, `remove`, `remove_all`, `map`, `flat_map`, `flatten`, `filter`, `filter_map`, `fold`, `reduce`, `any`, `all`, `find`, `position`, `enumerate`, `zip`, `take`, `skip`, `slice`, `chunks`, `min`, `max`, `sum`, `count`, `partition`, `group_by`, `to_map`.",
          ],
          [
            "`Map<K, V>`",
            "`len`, `is_empty`, `contains`, `contains_key`, `keys`, `values`, `items`, `get` (1 argument, returns `Option`), `get_path`, `map_values`, `filter`, `filter_keys`, `pick`, `insert`, `patch`, `extend`, `remove`, `remove_all`, `without`.",
          ],
          [
            "`Option<T>`",
            "`is_some`, `is_none`, `is_some_and`, `is_none_or`, `unwrap_or`, `unwrap_or_else`, `expect`, `or`, `or_else`, `map`, `map_or`, `map_or_else`, `and_then`, `filter`, `flatten`, `zip`, `ok_or`.",
          ],
          [
            "`Result<T, E>`",
            "`is_ok`, `is_err`, `ok`, `err`, `unwrap_or`, `unwrap_or_else`, `expect`, `map`, `map_err`, `and_then`, `or`, `or_else`.",
          ],
        ],
      },
      {
        type: "code",
        title: "Combining Built-in Helpers and Collection Methods",
        filename: "stdlib-pipeline.malm",
        lang: "malm",
        code: `malm 3
authority user

module stdlib_demo {
    option raw_ports: List<int> = [8080, 443, 80, 443, 3000]
    option labels: Map<string, string> = {
        app: "herda-shell",
        env: "production",
        debug: "off",
    }

    // Chain List, Map, Option, path, shell, json, hash, math, and color helpers
    let sorted_ports = raw_ports.unique().sort()
    let high_ports = sorted_ports.filter(|p| p >= 1000).map(|p| p.to_string())
    let public_meta = labels.pick(["app", "env"])
    let app_name = labels.get("app").unwrap_or("unknown")
    let cfg_path = path.join("~/.config", path.with_extension(app_name, "json"))
    let cmd = shell.join(["exec", app_name, "--config", cfg_path])

    let payload = json.stringify_pretty({
        app: app_name,
        ports: sorted_ports,
        high_ports: high_ports,
        meta: public_meta,
    })
    let digest = hash.sha256(payload)
    let clamped = math.clamp(14.6.round(), 8, 16)
    let accent = color.parse("#4DA3FF").lighten(0.06).hex()

    render "demo/stdlib.json" as json {
        command: cmd,
        sha256: digest,
        clamped: clamped,
        accent: accent,
        app_name: app_name,
    }
}`,
      },
    ],
  },

  /* ========================================================================
     7. EVERYDAY CLI COMMANDS & TOOLS
     ======================================================================== */
  {
    id: "cli-reference",
    group: "cli",
    badge: "CLI Reference",
    title: "Everyday CLI Commands & Tools",
    subtitle: "Checking packs, creating plans, deploying changes, inspecting values, and editor tooling",
    lead:
      "Use the `malm` command-line tool to check your pack, preview plans, apply updates, see why any setting has its current value, and roll back whenever you need to. Planning automatically picks up your personal `~/.config/malm/` files, and applying a saved plan works completely offline.",
    blocks: [
      {
        type: "steps",
        items: [
          {
            step: 1,
            title: "Format and Check Your Pack",
            description:
              "Check formatting with `malm fmt --check` and verify types, slots, circular references, and conflicts without writing any files.",
            code: "malm fmt --check && malm source check",
            lang: "sh",
          },
          {
            step: 2,
            title: "Lock Pack Sources",
            description:
              "Create or refresh `malm.lock` for the base pack before building plans.",
            code: "malm source lock create",
            lang: "sh",
          },
          {
            step: 3,
            title: "Plan, Review, and Apply",
            description:
              "Build a saved plan (or use `malm deploy` for an interactive review screen), inspect the diff with `malm plan show`, and apply safely.",
            code: "malm plan create --profile default\nmalm plan show\nmalm plan apply <PLAN_ID>",
            lang: "sh",
          },
          {
            step: 4,
            title: "Inspect Settings and Switch Profiles",
            description:
              "See which layer set a value with `malm why`, print effective scoped values with `malm resolve`, or switch profiles with `malm switch`.",
            code: "malm why herda_compositor.outer_gap\nmalm resolve --all --scope workpiece=Thesis\nmalm switch focus",
            lang: "sh",
          },
        ],
      },
      {
        type: "callout",
        tone: "accent",
        label: "Common Flags",
        title: "Flags Shared Across Commands",
        text:
          "Most subcommands accept `--format human|json`, `--color auto|always|never`, `--plain`, and `-v`/`--verbose`, plus target flags `--namespace <NS>` (default `default`), `--target <NAME=ABS_PATH>` (default `home=$HOME`), and `--target-authority <NAME>` (default `home`). To suggest a single option change from the terminal, use `malm propose --set KEY=VALUE`.",
      },
      {
        type: "table",
        caption: "Building, Locking, Planning & Applying",
        headers: ["Command", "Key Flags", "Purpose"],
        rows: [
          ["`malm fmt`", "`--check`, `[PATH]...`", "Formats Malm 3 files into a consistent style."],
          ["`malm source check`", "`--source <DIR>`", "Checks syntax, types, slots, circular references, and setting conflicts without writing files."],
          ["`malm source render`", "`--output <DIR>`, `--source <DIR>`, `--profile <P>`", "Renders a profile's output files into a private folder for inspection."],
          ["`malm source vars`", "`--source <DIR>`, `--profile <P>`, `[NAME]`", "Lists resolved option values and where they came from for a pack."],
          ["`malm source fork <MODULE>`", "`--source <DIR>`, `--namespace <NS>`, `-o <PATH>`", "Extracts a standalone editable copy of a module along with its helper files and templates."],
          ["`malm source lock create\\|update`", "`--source <DIR>`, `--allow-local`, `--allow-git`", "Creates or updates `malm.lock` to pin your base pack's dependencies."],
          ["`malm plan create`", "`--source <DIR>`, `--lock <FILE>`, `--cached`, `--profile <P>`, `--scope ...`", "Evaluates your pack, Settings customizations, and `~/.config/malm/` overrides into a saved plan."],
          ["`malm plan show [PLAN]`", "`--proposed`, `--namespace <NS>`", "Reviews a saved plan (`pp-...` / `plan:<hex>`) or pending proposals."],
          ["`malm plan apply <PLAN>`", "`--approval <DIGEST>`, `--yes`", "Applies a saved plan safely in one step, completely offline."],
          ["`malm deploy`", "`--source <DIR>`, `--lock <FILE>`, `--cached`, `--profile <P>`, `--yes`", "Plans changes, opens an interactive review screen, and applies once confirmed."],
          ["`malm switch <PROFILE>`", "`--namespace <NS>`, `--yes`", "Switches the active profile and applies it (`malm plan switch-profile` previews without applying)."],
          ["`malm plan customize`", "`--expected-head <GEN>`, `[DOC \\| --changes <FILE>]`, `--apply`, `--yes`", "Saves Settings or CLI customizations from a JSON document or change list."],
          ["`malm plan restore <GEN>`", "`--namespace <NS>`", "Plans a rollback to an earlier generation (also `plan disable\\|enable\\|remove\\|list\\|delete`)."],
        ],
      },
      {
        type: "table",
        caption: "Inspecting Settings, Proposals, Scopes & History",
        headers: ["Command", "Key Flags / Subcommands", "Purpose"],
        rows: [
          ["`malm why <KEY_OR_OUTPUT>`", "`--source <DIR>`, `--profile <P>`, `--scope ...`, `--namespace <NS>`", "Shows which layer won, which lower-priority writes were overridden, and whether Settings is locked."],
          ["`malm resolve [KEY \\| --all]`", "`--scope ...`, `--locale <TAG>`, `--namespace <NS>`", "Prints effective option values and readable descriptions (hiding `#[sensitive]` values)."],
          ["`malm history` / `malm reset`", "`reset <KEY> [--layer ...] [--scope ...]`", "Lists past generations, or resets a customized option back to its inherited value."],
          ["`malm statement`", "`at <KEY> --generation <SHA>`, `rewind <KEY> --to <SHA>`", "Checks what an option was set to in an older generation or rewinds just that option."],
          ["`malm scope`", "`list`, `rename`, `copy [--at <GEN>]`, `drop`", "Manages saved `workpiece=<NAME>` and `app=<ID>` customization scopes."],
          ["`malm propose` / `malm proposal`", "`--set K=V --by <WHO>`, `list\\|show\\|plan\\|accept\\|decline\\|discard`", "Submits and reviews pending suggestions saved in `~/.config/malm/proposed.kdl` (declined suggestions rest for 90 days)."],
          ["`malm export` / `malm import`", "`export [--include-paths] [-o FILE]`, `import --as proposed <FILE>`", "Shares portable customization baselines safely (skips `#[sensitive]` secrets and never auto-applies on import)."],
          ["`malm namespace`", "`list`, `show`, `profiles`, `customizations`, `status`, `history`, `generation`", "Inspects namespaces, active profiles, saved customizations, and generation history."],
          ["`malm store`", "`status`, `init`, `verify`, `recover`, `gc`", "Checks, verifies, repairs, or cleans up Malm's local state store."],
        ],
      },
      {
        type: "grid",
        columns: 2,
        cards: [
          {
            title: "malmd (Background Service)",
            tag: "User Session",
            tone: "accent",
            description:
              "Starts on demand in your desktop session to keep lookups fast, watches ~/.config/malm/ for edits automatically, and coordinates Settings and theme updates cleanly.",
            code: "malmd --activate --user-overlay-dir ~/.config/malm",
            lang: "sh",
          },
          {
            title: "malm-lsp (Editor Support)",
            tag: "Language Server",
            tone: "ok",
            description:
              "Provides live error checking, hover type and doc previews, completions, go-to-definition, and automatic formatting for Malm 3 packs and ~/.config/malm/ files in any LSP-compatible editor.",
            code: "malm-lsp",
            lang: "sh",
          },
        ],
      },
      {
        type: "code",
        title: "Everyday Inspection, Sharing & Rollback Example",
        filename: "session.sh",
        lang: "sh",
        code: `# Check your pack and deploy the \`focus\` profile
malm source check
malm deploy --profile focus

# See why an option got its value and whether ~/.config/malm/ locked it
malm why herda_compositor.outer_gap --profile focus

# Print all effective values for a specific workpiece scope
malm resolve --all --scope workpiece=Thesis

# Export shareable customizations and import them on another machine for review
malm export --layer you -o my-baseline.kdl
malm import --as proposed my-baseline.kdl

# View past generations and roll back cleanly if needed
malm history
malm plan restore <GENERATION_SHA256>`,
      },
    ],
  },
];
