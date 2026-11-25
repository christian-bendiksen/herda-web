// Malm 3 Documentation: Modules, Local Overrides, Override Mechanisms, and Precedence Simulator

window.MalmDocs = window.MalmDocs || {};

window.MalmDocs.moduleSections = [
  {
    id: "modules-layout",
    group: "modules",
    badge: "Malm 3",
    title: "Multi-File Packs and Modules",
    subtitle: "Organizing a pack from malm.malm into reusable files, shared helpers, and templates",
    lead: "A Malm 3 pack starts at a single malm.malm file and grows cleanly into as many files as you need. Everything is read and checked together before any config file is generated.",
    blocks: [
      {
        type: "prose",
        html: "<p>Every user configuration pack begins with a root <code>malm.malm</code> file that starts with <code>malm 3</code> and an optional <code>authority user</code> (or <code>authority os</code>) line. Child files loaded with <code>mod</code> can leave out the <code>malm 3</code> header, while standalone imported files and local override files always include it.</p><p>Malm 3 supports two ways to organize files, and most real packs combine both: <strong>flat <code>import \"...\"</code></strong> for pulling top-level modules, looks, and machines into <code>malm.malm</code>, and <strong><code>pub mod</code> / <code>pub use crate::...</code></strong> for building tidy shared libraries with clear public boundaries.</p>"
      },
      {
        type: "tabs",
        id: "tab-pack-layout",
        label: "Complete Multi-File Pack Example",
        tabs: [
          {
            id: "tree",
            label: "Directory Tree",
            filename: "my-pack/",
            lang: "tree",
            note: "A typical Malm 3 desktop pack layout: one malm.malm entry point, a mod.malm hub for shared types and slots, look and machine files, and self-contained module folders with optional .tpl templates.",
            code: `my-pack/
├── malm.malm                        # Entry point: pack metadata and imports
├── malm.lock                        # Lockfile pinning the base pack files
└── malm/
    ├── mod.malm                     # Shared library hub: pub mod and pub use re-exports
    ├── contracts.malm               # Shared pub slot, pub struct, pub enum, pub fn
    ├── defaults.malm                # Shared pub module vars (fonts, displays)
    ├── palette.malm                 # Pure color and palette helper functions
    ├── selection/
    │   └── axes.malm                # Choice axes and selection options
    ├── looks/
    │   └── herda/
    │       └── look.malm            # Visual look layer (#[priority(160)])
    ├── machines/
    │   └── laptop-2k.malm           # Hardware settings for one machine
    └── modules/
        └── compositor/
            ├── compositor.malm      # Module options, role slot, and outputs
            └── config.tpl           # Optional external template file`
          },
          {
            id: "malm-root",
            label: "malm.malm",
            filename: "malm.malm",
            lang: "malm",
            note: "Flat import lines load your shared mod.malm hub, selection axes, look and machine layers, and desktop modules into the pack root.",
            code: `malm 3
authority user

pack "dev.herda.workshop" {
    target: "~/.config",
    default_machine: "laptop-2k",
    default_profile: "default",
    author: "Herda Authors",
    malm_version: ">=3.0",
}

// Shared helpers, defaults, and role slots (exported from mod.malm).
import "malm/mod.malm"
import "malm/selection/axes.malm"

// Look and hardware layers.
import "malm/looks/herda/look.malm"
import "malm/machines/laptop-2k.malm"

// Desktop modules (glob patterns like "malm/modules/*/*.malm" also work).
import "malm/modules/compositor/compositor.malm"
import "malm/modules/pace/pace.malm"`
          },
          {
            id: "malm-mod",
            label: "malm/mod.malm",
            filename: "malm/mod.malm",
            lang: "malm",
            note: "A module hub loads child files with pub mod and re-exports the public items other files need using pub use crate::....",
            code: `malm 3

// Load child files from malm/<name>.malm (or malm/<name>/mod.malm).
pub mod palette;
pub mod defaults;
pub mod contracts;

// Re-export the public API for the rest of the pack.
// Items without pub stay private to their own file.
pub use crate::palette::resolve_palette;
pub use crate::defaults::{DisplayGeometry, DisplayMap};
pub use crate::contracts::{
    DesktopAction,
    DesktopEntry,
    serialize_desktop_entry,
};`
          },
          {
            id: "malm-contracts",
            label: "malm/contracts.malm",
            filename: "malm/contracts.malm",
            lang: "malm",
            note: "Define shared role slots (max = 1), tagged enums, validated structs, and pure helper functions in one place.",
            code: `malm 3

// Role slots ensure only one module fills each desktop role.
pub slot compositor max = 1 {
    option layout: string
}

pub slot notifications max = 1 {
    option timeout: int
}

pub slot terminal max = 1 {
    option font_size: float
}

#[wire(tag = "kind", rename_all = "snake_case")]
pub enum DesktopAction {
    Operation {
        operation: string,
        arguments: Option<any>,
    },
    Application {
        id: string,
    },
    LegacyCommand {
        program: string,
        arguments: Option<List<string>>,
    },
}

pub struct DesktopEntry {
    kind: enum<container|action|toggle|list>,
    label: string,
    order: int(0..=999) = 50,
    confirm: bool = false,
}

// Private helper: only usable inside contracts.malm.
fn clean_label(raw: string) -> string {
    raw.trim()
}

pub fn serialize_desktop_entry(e: DesktopEntry) -> Map<string, any> {
    { kind: e.kind, label: clean_label(e.label), order: e.order }
}`
          },
          {
            id: "compositor-malm",
            label: "compositor.malm",
            filename: "malm/modules/compositor/compositor.malm",
            lang: "malm",
            note: "A reusable module that fills the compositor slot, reads shared vars.font_mono, and writes both a template-based config and a JSON file.",
            code: `malm 3

struct Keybind {
    mods: string,
    keysym: string,
    command: string,
}

#[notify(compositor_reload)]
module herda_compositor {
    doc "Wayland compositor layout, spacing, and keybindings"
    impl compositor;

    option enabled: bool = true
    option layout: enum<stage|dwindle|tile|floating> = "stage"

    #[sentence("The outer window margin is {value} px.")]
    option outer_gap: int(0..=64) = 8

    option gap: int(0..=64) = 8
    option smart_gaps: bool = true

    option binds: Map<string, Keybind> = {
        close: { mods: "SUPER", keysym: "w", command: "close" },
        help: { mods: "SUPER", keysym: "F1", command: "show-help" },
        quit: { mods: "SUPER+Shift", keysym: "q", command: "quit" },
    }

    if enabled {
        render "herda-compositor/compositor.conf" as tpl("malm/modules/compositor/config.tpl") {
            layout: layout,
            gap: gap,
            outer_gap: outer_gap,
            smart_gaps: smart_gaps,
            font_mono: vars.font_mono,
            binds: binds,
        }

        render "herda-compositor/config.json" as json(case: "snake") {
            layout: layout,
            gap: gap,
            outer_gap: outer_gap,
            smart_gaps: smart_gaps,
            binds: binds,
        }
    }
}`
          },
          {
            id: "compositor-tpl",
            label: "config.tpl",
            filename: "malm/modules/compositor/config.tpl",
            lang: "tpl",
            note: "External .tpl templates support {{ expr }}, whitespace-trimming {%- ... -%}, if, for, let, and {# comments #}. Single braces { } and shell variables like $VAR pass through untouched.",
            code: `{# Generated by Malm 3. Override settings in ~/.config/malm/ instead of editing this file. #}
layout = {{ layout }}
gap = {{ gap }}
outer_gap = {{ outer_gap }}
font_mono = "{{ font_mono }}"
{%- if smart_gaps %}
smart_gaps = true
{%- endif %}

{% for (name, b) in binds -%}
bind {{ name }} = {{ b.mods }}+{{ b.keysym }} -> {{ b.command }}
{% endfor -%}`
          }
        ]
      },
      {
        type: "grid",
        columns: 2,
        cards: [
          {
            title: "Structured mod, use, and pub",
            tag: "Private by Default",
            tone: "accent",
            description: "Writing `mod foo;` or `pub mod bar;` loads `foo.malm` or `foo/mod.malm` (having both is an error). Inside a nested file, Malm checks child folders first and then sibling files. Inline `mod foo { ... }` blocks work too.",
            code: `pub mod contracts;\npub use crate::contracts::{DesktopAction, *};\nuse crate::palette::resolve_palette as norm;`,
            lang: "malm"
          },
          {
            title: "Flat import \"...\"",
            tag: "Pack Entry",
            tone: "ok",
            description: "Loads another file (or a glob pattern) straight into the top-level namespace. Use it in `malm.malm` to wire up looks, machines, profiles, and independent modules with minimal boilerplate.",
            code: `import "malm/mod.malm"\nimport "malm/looks/herda/look.malm"\nimport "malm/modules/pace/pace.malm"`,
            lang: "malm"
          }
        ]
      },
      {
        type: "callout",
        tone: "changed",
        label: "Visibility Rule",
        title: "Items Stay Private Unless Marked pub",
        text: "Everything declared inside a file loaded with `mod` is private to that file by default. Add `pub` to structs, enums, slots, functions, or child modules you want to share, and re-export them with `pub use crate::...`. Trying to use a private item from another module is rejected during validation."
      }
    ]
  },

  {
    id: "modules-anatomy",
    group: "modules",
    badge: "Options & Outputs",
    title: "Inside a Module",
    subtitle: "Typed options, helpful attributes, validation checks, file outputs, and cross-module links",
    lead: "A module defines the settings a feature exposes, validates them with clear rules, and renders the exact config files, static assets, or symlinks that app needs.",
    blocks: [
      {
        type: "code",
        title: "Anatomy of a Complete Module",
        filename: "malm/modules/pace/pace.malm",
        lang: "malm",
        badge: "Malm 3",
        caption: "A real module combining typed options, scope and privacy attributes, struct validation, local helpers, warning and assertion checks, a cross-module setting, and rendered plus static outputs.",
        code: `malm 3

type PaceLevel = enum<none|batched|normal|all|still|quiet|standard|open>

// Validation rule checked whenever this struct is created or updated.
struct PaceWindows {
    #[sentence("Batched arrives together every {value} minutes.")]
    quiet: int(5..=1440),
    standard: int(1..=240),
} where {
    standard <= quiet,
}

#[notify(shell_reload, units_reload(["herda-launcherd.service"]))]
module pace {
    doc "Interruptions: delivery windows, daily budget, and per-workpiece cadence"
    requires ["herda-launcherd"]

    option enabled: bool = true

    #[scope(workpiece)]
    #[sentence("Every room: {value} unless the room says otherwise.")]
    option level: PaceLevel = "normal"

    #[scope_only(app)]
    option app_route: Option<string>

    #[machine_only]
    option hardware_led_path: path = "/sys/class/leds/notify"

    #[sensitive]
    option webhook_token: Option<string>

    #[wire("windowMinutes")]
    option window_minutes: PaceWindows = { quiet: 90, standard: 20 }

    option sounds: Option<bool>
    option low_timeout: int(1000..=30000) = 4000
    option timeout: int(1000..=60000) = 8000

    // Local helper reading another module's resolved option.
    let effective_sounds = sounds.unwrap_or(shell_design.sounds)

    // warn! reports a non-fatal hint; assert! stops the plan with an error.
    if low_timeout > timeout {
        warn!("pace.low_timeout exceeds pace.timeout")
    }
    assert!(window_minutes.quiet >= 5, "quiet window must be at least 5 minutes")

    // Cross-module write inside a module body runs at priority 50.
    notifications.timeout = timeout

    if enabled {
        // KDL output automatically skips fields whose value is None.
        render "herda/pace.kdl" as kdl {
            pace(version: 1) {
                level(level)
                sounds(effective_sounds)
                for w in scopes.workpiece {
                    workpiece(w.id, name: w.name, level: w.pace.level)
                }
            }
        }

        // Copy a static file (with octal permissions), copy a folder, or create a symlink.
        file "~/.local/bin/pace-ctl" from = "malm/modules/pace/bin/pace-ctl" mode = "0755"
        dir "herda/pace-assets" from = "malm/modules/pace/assets"
        link "herda/pace-active.kdl" to = "pace.kdl"
    }
}`
      },
      {
        type: "table",
        caption: "Module and Option Attributes",
        headers: ["Attribute", "Applies To", "What It Does"],
        rows: [
          ["`#[notify(...)]`", "Module or single output", "Tells Malm what to reload after applying changes: `none`, `compositor_reload`, `compositor_theme_reload`, `shell_reload`, `portal_restart`, `greeter_sync`, `font_cache_refresh`, `units_reload([...])`, `units_restart([...])`, `signal(\"proc\", \"SIG\")`, or a custom hook name. Putting `#[notify]` on one output overrides the module default."],
          ["`#[scope(workpiece)]` / `#[scope(app)]`", "`option`", "Allows this option to be overridden per workpiece or per app in layers, Settings, and `--scope` commands."],
          ["`#[scope_only(workpiece)]` / `#[scope_only(app)]`", "`option`", "Restricts the option so it can only be set inside a workpiece or app scope, never globally on a machine or profile."],
          ["`#[machine_only]`", "`option`", "Restricts the option to machine and global levels so hardware facts like `vars.display` cannot be changed inside workpiece or app scopes."],
          ["`#[sensitive]`", "`option`", "Masks the value as `\"<redacted>\"` in `malm resolve`, `malm why`, and logs, and leaves it out of `malm export`."],
          ["`#[sentence(\"...\")]` / `#[sentence_prefix(\"...\")]`", "`option`", "Provides plain-English wording shown in Settings and `malm resolve` using `{value}`, `{parent}`, `{workpiece}`, and `{app}` placeholders."],
          ["`#[wire(\"exactName\")]`", "`option`, `enum`, or `struct`", "Pins the exact JSON or config key name (option names use underscores like `outer_gap`, and tools also accept hyphens like `outer-gap`), or sets tagged enum formatting such as `#[wire(tag = \"kind\", rename_all = \"snake_case\")]`."],
          ["`#[deprecated]` / `#[deprecated(\"msg\")]`", "`option` or declaration", "Shows a non-fatal warning when another file still uses an older option name."]
        ]
      },
      {
        type: "grid",
        columns: 2,
        cards: [
          {
            title: "Reading Across Modules",
            tag: "Automatic Order",
            tone: "ok",
            description: "Any module can read another module's final option value with `<module>.<option>` (such as `vars.font_mono` or `shell_design.sounds`). Malm automatically computes the right evaluation order across files, and circular option dependencies are rejected before applying.",
            code: `// Malm resolves vars and shell_design first:\nlet mono = vars.font_mono\nlet snd = sounds.unwrap_or(shell_design.sounds)`,
            lang: "malm"
          },
          {
            title: "Writing Across Modules",
            tag: "Priority 50",
            tone: "accent",
            description: "A module can also contribute settings or keybindings to another module directly inside its body (or inside `impl Slot { ... }`), even inside an `if` block. These cross-module writes run at priority `50`, so they beat defaults (`0` and `10`) while remaining easy to override from looks, machines, profiles, Settings, or `~/.config/malm/`.",
            code: `module night_light {\n    if enabled {\n        herda_compositor.binds.insert("night-toggle", {\n            mods: "SUPER", keysym: "n", command: "night-toggle",\n        })\n    }\n}`,
            lang: "malm"
          }
        ]
      }
    ]
  },

  {
    id: "modules-contracts",
    group: "modules",
    badge: "Patterns",
    title: "Role Slots, Parameterized Modules, and Reusable Patterns",
    subtitle: "Swappable desktop roles, parameterized system modules, feature toggles, and shared defaults",
    lead: "Role slots let you swap implementations without rewriting the rest of your pack, parameterized modules make system building blocks reusable, and a few simple patterns keep large packs effortless to maintain.",
    blocks: [
      {
        type: "tabs",
        id: "tab-contracts-patterns",
        label: "Reusable Pack Patterns",
        tabs: [
          {
            id: "role-slots",
            label: "Role Slots (User)",
            filename: "malm/contracts.malm",
            lang: "malm",
            note: "Declare a single-owner role slot with max = 1. A module writes `impl compositor;` to prove it defines every required option, or uses `impl Slot { ... }` to contribute data at priority 50.",
            code: `malm 3

pub slot compositor max = 1 {
    option layout: string
}

pub slot DesktopProvider {
    option desktop_contribution: Option<DesktopContribution>
}

module herda_compositor {
    // Checked before planning: must define option layout: string,
    // and no second module can also claim the compositor slot.
    impl compositor;

    option layout: string = "stage"

    // Scoped slot block contributes at priority 50.
    impl DesktopProvider {
        desktop_contribution = Some({
            actions: Some({}),
            states: None,
            entries: None,
            settings: None,
        })
    }
}`
          },
          {
            id: "param-os",
            label: "Parameterized Modules (OS)",
            filename: "/usr/share/herda/distro-modules/kernel.malm",
            lang: "malm",
            note: "In authority os packs, modules can accept typed parameters with defaults, fill a slot with `impl slot <name>`, and expose `pub` fields that other blocks read through `slots.<slot>.<field>`.",
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

system workstation {
    use kernel("linux-zen");

    // Read the chosen kernel's package name without hardcoding "linux-zen".
    export fact "kernel_package" = slots.kernel.pkg
}`
          },
          {
            id: "axis-enable",
            label: "Feature Toggles with Axes",
            filename: "malm/modules/pace/pace.malm",
            lang: "malm",
            note: "Give optional modules an `option enabled: bool = true`, wrap outputs in `if enabled { ... }`, and let a layer turn them on or off based on a pack axis like `selection.look`.",
            code: `malm 3

axis look {
    default: "herda",
    options: ["herda", "minimal"],
    doc: "Desktop visual and shell look",
}

module selection {
    option look: string = "herda"
}

module pace {
    option enabled: bool = true
    option level: enum<quiet|normal|open> = "normal"

    if enabled {
        render "herda/pace.kdl" as kdl {
            pace(version: 1) {
                level(level)
            }
        }
    }
}

// Turns pace off automatically on looks that do not use it,
// while still letting you re-enable it in ~/.config/malm/ at priority 400.
layer "pace-margin" {
    pace.enabled = selection.look == "herda"
}`
          },
          {
            id: "vars-and-scopes",
            label: "Shared Vars & Scopes",
            filename: "malm/defaults.malm + pace.malm",
            lang: "malm",
            note: "Keep shared fonts and display geometry in `pub module vars`, and loop over `scopes.workpiece` and `scopes.app` inside render blocks to emit per-room or per-app settings.",
            code: `malm 3

// Shared defaults module (malm/defaults.malm)
pub module vars {
    doc "Shared font families and display geometry"

    option font_family: string = "Inter"
    option font_mono: string = "JetBrains Mono"

    #[machine_only]
    option display: Map<string, any> = {
        internal: { name: "eDP-1", width: 2568, height: 1800, scale: 2.0 },
    }
}

// Loop over active workpieces and apps when rendering outputs.
// Each item already includes all resolved options for that scope.
module capability {
    #[scope(app)]
    option network: enum<on|off> = "on"

    render "herda/scopes.json" as json(case: "camel") {
        font: vars.font_family,
        workpieces: [for w in scopes.workpiece { {
            id: w.id,
            name: w.name,
            level: w.pace.level,
        } }],
        apps: [for a in scopes.app { {
            id: a.id,
            network: a.capability.network,
        } }],
    }
}`
          }
        ]
      },
      {
        type: "table",
        caption: "Built-In Safety Checks Before Anything Is Applied",
        headers: ["Check", "What Malm Catches", "Why It Helps"],
        rows: [
          ["Circular dependencies", "Two or more options or defaults that depend on each other in a loop", "Circular option dependencies are rejected before applying so evaluation always finishes predictably."],
          ["Priority conflicts", "Two assignments (`=` or `.insert(key, val)`) at the same priority with different values", "Eliminates silent file-order bugs; you choose an explicit `#[priority(N)]`, `.patch(...)`, or `#[force]`."],
          ["Role slot contracts", "Referencing an unknown slot, missing a required option, or filling a `max = 1` slot twice", "Catches broken or conflicting desktop replacements before generating any files."],
          ["Scope boundaries", "Writing a `#[scope_only]` option globally, or writing a `#[machine_only]` option inside a workpiece or app scope", "Keeps hardware settings at the machine level and per-app settings in their proper scope."],
          ["Exhaustive `match`", "A `match` expression on an `enum` that forgets to handle one of its variants", "Makes sure adding a new variant never leaves an unhandled case behind."],
          ["Module privacy", "Accessing a helper, type, or module from another file without `pub`", "Items stay private to their file unless marked `pub`, keeping shared libraries clean."],
          ["User vs. OS boundaries", "Putting OS packages in an `authority user` pack, or writing `$HOME` files and desktop reloads in an `authority os` pack", "Keeps user config packs and system image definitions cleanly separated."],
          ["Deprecation warnings", "Referencing an option or helper marked `#[deprecated]`", "Gives you a gentle heads-up to update your pack without blocking your deploy."]
        ]
      }
    ]
  }
];

window.MalmDocs.overrideSections = [
  {
    id: "overrides-local-config",
    group: "overrides",
    badge: "Priority 400",
    title: "Local Overrides in ~/.config/malm/",
    subtitle: "Customize any installed pack without editing packaged files",
    lead: "Drop normal Malm 3 files and .tpl templates into ~/.config/malm/ to override options, extend or replace whole modules, or patch generated config files at priority 400.",
    blocks: [
      {
        type: "steps",
        items: [
          {
            step: 1,
            title: "Explicit Daemon Flag (--user-overlay-dir)",
            description: "If `malmd` is started with `--user-overlay-dir <PATH>`, Malm uses that exact folder and ignores environment variables."
          },
          {
            step: 2,
            title: "$MALM_USER_OVERLAY_DIR (Or Set Empty to Disable)",
            description: "When set to a folder path, Malm reads local overrides from there. Setting `MALM_USER_OVERLAY_DIR=\"\"` turns local override discovery off completely, which is handy for clean tests.",
            code: `MALM_USER_OVERLAY_DIR="" malm plan create --source /usr/share/herda/smia`,
            lang: "sh"
          },
          {
            step: 3,
            title: "$XDG_CONFIG_HOME/malm",
            description: "Used automatically whenever `XDG_CONFIG_HOME` is set."
          },
          {
            step: 4,
            title: "$HOME/.config/malm (Default)",
            description: "The standard local override folder when neither `MALM_USER_OVERLAY_DIR` nor `XDG_CONFIG_HOME` is set."
          }
        ]
      },
      {
        type: "prose",
        html: "<p><strong>How files in <code>~/.config/malm/</code> are loaded:</strong> Malm scans your local override folder in sorted path order (up to 32 folders deep and 1 MiB per file, safely skipping symlink loops). It picks up every <code>.malm</code> file starting with <code>malm 3</code>, along with any <code>.tpl</code> templates and custom themes under <code>~/.config/malm/gnist/themes/data/&lt;name&gt;/colors.toml</code>.</p><p>During planning, Malm loads the installed base pack first and then applies your local folder on top:</p><ul><li>If <code>~/.config/malm/malm.malm</code> exists, Malm loads <strong>only</strong> that file, giving you full control over your own <code>import</code> and <code>mod</code> tree.</li><li>Otherwise (or for OS packs with <code>system.malm</code>), Malm <strong>automatically loads every <code>malm 3</code> file</strong> in sorted order, skipping files already imported by another local file.</li></ul>"
      },
      {
        type: "callout",
        tone: "changed",
        label: "Good to Know",
        title: "Your Override Files vs. Malm's Managed Files in ~/.config/malm/",
        text: "Two files under `$HOME/.config/malm/` are managed by Malm rather than written by hand: (1) `customizations/<namespace>.json` is a read-only mirror of your saved Settings edits (Malm writes it for inspection, while the real saved copy lives in Malm's store). (2) `proposed.kdl` holds pending suggestions from `malm propose` and has zero effect until you accept them. Both stay under `$HOME/.config/malm/` even if `XDG_CONFIG_HOME` points elsewhere."
      },
      {
        type: "callout",
        tone: "danger",
        label: "Common Mistake",
        title: "A Bare layer { ... } in ~/.config/malm/ Has Priority 100, Not 400",
        text: "If you put a plain `layer \"personal\" { ... }` in `~/.config/malm/`, it gets the default layer priority of `100`. That means pack looks (`160`), machines (`200`), profiles (`300`), and Settings edits (`325` to `375`) will all beat it! Always write `#[priority(400)] layer \"personal\" { ... }` on standalone layers, or use `extend module` / `override module`, which automatically run at priority `400`."
      },
      {
        type: "tabs",
        id: "tab-local-overlay-constructs",
        label: "Ways to Override in ~/.config/malm/",
        tabs: [
          {
            id: "priority-layer",
            label: "#[priority(400)] layer",
            filename: "~/.config/malm/personal.malm",
            lang: "malm",
            note: "Put #[priority(400)] on standalone layers in ~/.config/malm/ so they override profiles (300) and Settings edits (325 to 375). Works for single values, map/list edits, and workpiece or app scopes.",
            code: `malm 3

// Always add #[priority(400)] on standalone layers in ~/.config/malm/
// so they beat looks (160), profiles (300), and Settings (325 to 375).
#[priority(400)]
layer "personal" {
    herda_compositor.outer_gap = 12

    // Edit one keybinding at a time without replacing the whole map.
    herda_compositor.binds.insert("my-term", {
        mods: "SUPER",
        keysym: "Return",
        command: "spawn,kitty",
    })
    herda_compositor.binds.remove("help")

    // Scoped blocks inside a priority-400 layer also run at priority 400.
    workpiece "Thesis" {
        pace.level = "quiet"
    }
    app "org.gnome.Apostrophe" {
        capability.network = "off"
    }
}`
          },
          {
            id: "extend-module",
            label: "extend module",
            filename: "~/.config/malm/extend-compositor.malm",
            lang: "malm",
            note: "Automatically runs at priority 400. Lets you tweak options, add extra output files or reload hooks, or replace a base module's output file by targeting the same path.",
            code: `malm 3

// Runs at priority 400 automatically (no #[priority(400)] needed).
extend module herda_compositor {
    herda_compositor.outer_gap = 12
    herda_compositor.binds.patch({
        "my-term": { mods: "SUPER", keysym: "Return", command: "spawn,kitty" },
    })

    // Adds a new output file to this module.
    // Targeting an existing output path replaces that base file instead.
    render "herda-compositor/local-extra.conf" as text {
        "# Added from ~/.config/malm/extend-compositor.malm\\nscroll_factor = 1.2\\n"
    }
}`
          },
          {
            id: "override-module",
            label: "override module + fork",
            filename: "~/.config/malm/notifications.malm",
            lang: "malm",
            note: "Run `malm source fork <module> -o ~/.config/malm/<module>.malm` to copy a module and its helpers, then change `module` to `override module` to replace the base version cleanly.",
            code: `malm 3

// Start by copying the existing module into your local override folder:
//   malm source fork notifications -o ~/.config/malm/notifications.malm
// Then change "module notifications" to "override module notifications":
// - Replaces the entire base module cleanly at priority 400
// - Drops replaced local helpers so nothing collides
// - Lets you rewrite or remove any output file completely

#[notify(units_restart(["mako.service"]))]
override module notifications {
    doc "Personal notification daemon override"
    impl notifications;

    option timeout: int(1000..=60000) = 5000

    render "mako/config" as ini {
        default: {
            "default-timeout": timeout,
            "border-radius": 8,
            "background-color": "#181D28",
            "text-color": "#E8ECF4",
        },
    }
}`
          },
          {
            id: "overlay-structured",
            label: "overlay json|toml|ini|kdl",
            filename: "~/.config/malm/patch-outputs.malm",
            lang: "malm",
            note: "Runs right after config files are rendered (at priority 400). Parses the generated JSON, TOML, INI, or KDL file, applies typed edits, and writes it back cleanly.",
            code: `malm 3

// Patch rendered config files directly, even when the module
// does not expose a dedicated option for the field you want.

overlay json "herda-compositor/config.json" {
    custom_flag = true
    input.patch({
        repeat_rate: 45,
        repeat_delay: 220,
    })
}

overlay toml "helix/config.toml" {
    editor.patch({
        line_number: "relative",
        cursorline: true,
    })
}

overlay kdl "herda/pace.kdl" {
    pace.digest_after = "4h"
}

overlay ini "fontconfig/extra.ini" {
    rendering.insert("hintstyle", "hintslight")
}`
          },
          {
            id: "overlay-text",
            label: "overlay text",
            filename: "~/.config/malm/gtk-tweaks.malm",
            lang: "malm",
            note: "Safely patches plain text outputs like CSS or shell scripts after rendering. Anchored edits fail loudly if the target text is missing or appears more than once.",
            code: `malm 3

// Safe text patching for CSS, shell scripts, or custom formats.
// replace_once and insert_after_once stop with an error if the anchor
// matches zero times or more than once.
overlay text "gtk-4.0/gtk.css" {
    prepend_lines([
        "/* Local tweaks from ~/.config/malm/gtk-tweaks.malm */",
    ])
    replace_once("border-radius: 12px;", "border-radius: 8px;")
    insert_after_once("/* custom-hook */", [
        "window { outline: none; }",
    ])
    append_lines([
        "/* end local tweaks */",
    ])
}`
          },
          {
            id: "profile-disable-lock",
            label: "Profile, Disable & Lock",
            filename: "~/.config/malm/pack-defaults.malm",
            lang: "malm",
            note: "Change default_profile with a pack block, turn off a module's outputs with enabled = false, and see how overrides above priority 375 lock that control in Settings.",
            code: `malm 3

// Override the pack's default profile (the last pack block wins).
pack "dev.herda.smia.local" {
    default_profile: "focus",
}

// Disable an optional module's outputs without forking it:
#[priority(400)]
layer "disable-unused" {
    night_light.enabled = false
}

// Why Settings locks options set in ~/.config/malm/:
// Settings writes at priorities 325 to 375. Because ~/.config/malm/ runs
// at priority 400, any option set here wins over Settings and shows as
// locked in Settings, malm resolve, and malm why so you never make an edit
// in the UI that gets silently ignored.`
          }
        ]
      },
      {
        type: "table",
        caption: "Which Commands Read ~/.config/malm/?",
        headers: ["Command or Service", "Reads ~/.config/malm/?", "What Happens"],
        rows: [
          ["`malm source lock create` / `update`", "No", "Locks only the base pack itself into `malm.lock`."],
          ["`malm source check`", "No", "Validates the base pack on its own without local overrides."],
          ["`malm source render` / `source vars`", "No", "Previews the base pack on its own without local overrides."],
          ["`malm plan create` / `malm deploy`", "Yes (automatic)", "Loads `~/.config/malm/` on top of the base pack and builds a complete preview plan."],
          ["`malm switch` / `plan switch-profile` / `plan customize` / `plan refresh`", "Yes (automatic)", "Re-reads live `~/.config/malm/` files whenever a new plan is built."],
          ["`malm plan apply <PLAN>`", "No", "Applies the already-built files saved inside that plan, so editing `~/.config/malm/` afterward cannot silently alter a plan you already reviewed."],
          ["`malm resolve` / `malm why`", "Yes (automatic)", "Includes live `~/.config/malm/` overrides and refreshes cached values automatically when files change."],
          ["`malmd` background daemon", "Yes (automatic)", "Watches `~/.config/malm/` for file changes and clears its resolve cache right away."]
        ]
      }
    ]
  },

  {
    id: "overrides-other-mechanisms",
    group: "overrides",
    badge: "All Methods",
    title: "Every Other Way to Override Defaults",
    subtitle: "Pack layers, scopes, Settings edits, proposals, map and list helpers, #[force], OS overlays, and environment variables",
    lead: "Local files in ~/.config/malm/ are just one layer in Malm. Pack layers, profiles, workpiece and app scopes, Settings changes, reviewable proposals, and OS overlays all follow the exact same priority order.",
    blocks: [
      {
        type: "tabs",
        id: "tab-other-overrides",
        label: "Other Ways to Override Settings",
        tabs: [
          {
            id: "pack-layers",
            label: "Pack Layers & Axes",
            filename: "malm/looks/herda/look.malm",
            lang: "malm",
            note: "Pack authors build up defaults in clean steps: option defaults (0), #[default] soft defaults (10), regular layers (100), look layers (160), machine blocks (200), and profiles (300).",
            code: `malm 3

// Soft default (priority 10): beats option defaults (0), loses to module writes (50).
#[default]
layer "seed-apps" {
    default_apps.browser = "org.mozilla.firefox.desktop"
}

// Conditional look layer (priority 160 in Herda's desktop pack).
#[priority(160)]
layer "herda-plate" if selection.look == "herda" {
    vars.font_family = "Inter"
    vars.font_mono = "JetBrains Mono"
    herda_compositor.gap = 6
    herda_compositor.outer_gap = 6
    herda_compositor.window_corner_radius = 12
}

// Machine hardware block (priority 200; "default" always matches).
machine "laptop-2k" {
    vars.display.patch({
        internal: { name: "eDP-1", width: 2568, height: 1800, scale: 2.0 },
    })
}

// Profile block (priority 300; pick with --profile focus or malm switch focus).
profile "focus" {
    pace.level = "batched"
    pace.calendar_lead_minutes = 5
}`
          },
          {
            id: "scoped-blocks",
            label: "Workpiece & App Scopes",
            filename: "malm/profiles/focus.malm + CLI",
            lang: "malm",
            note: "Inside any layer, machine, or profile, `workpiece \"...\"` and `app \"...\"` blocks run at priority 310 (or higher if the enclosing block is higher). Manage scopes on the CLI with `--scope` and `malm scope`.",
            code: `malm 3

profile "focus" {
    pace.level = "batched"

    // Applies at priority 310 when workpiece "Thesis" is active.
    workpiece "Thesis" {
        pace.level = "quiet"
    }

    // Applies at priority 310 for app "org.gnome.Apostrophe".
    app "org.gnome.Apostrophe" {
        capability.network = "off"
    }
}

// CLI scope commands:
//   malm plan create --scope workpiece=Thesis --scope app=org.gnome.Apostrophe
//   malm resolve pace.level --scope workpiece=Thesis
//   malm why pace.level --scope workpiece=Thesis
//   malm scope list | rename <old> <new> | copy <src> <dst> | drop <scope>`
          },
          {
            id: "customizations-json",
            label: "Settings & Customizations",
            filename: "changes.json (Priority 325 to 375)",
            lang: "json",
            note: "Settings UI, `malm plan customize`, `malm reset`, and `malm statement rewind` save your personal edits at priorities 325 to 375 inside Malm's history so they stay editable and reversible.",
            code: `{
  "schema": "malm.customizations-changes/v2",
  "machine": {
    "herda_compositor.outer_gap": { "operation": "set", "value": 10 },
    "night_light.temperature": { "operation": "drop" }
  },
  "profiles": {
    "$current": {
      "pace.level": { "operation": "set", "value": "still" }
    }
  },
  "workpieces": {
    "Thesis": {
      "pace.level": { "operation": "set", "value": "quiet" }
    }
  }
}`
          },
          {
            id: "proposals-baselines",
            label: "Proposals & Export/Import",
            filename: "proposals-and-baselines.sh",
            lang: "sh",
            note: "Scripts, assistants, or imported baselines can suggest changes with `malm propose`. Suggestions wait safely in ~/.config/malm/proposed.kdl until you accept them; declining pauses suggestions for that key for 90 days.",
            code: `# Queue a suggested change (--set is used on malm propose)
malm propose --set pace.level=still --scope workpiece=Thesis \\
  --by apprentice --note "Reduce interruptions while writing"

# Review queued proposals without changing your active config
malm proposal list
malm proposal show prop-01
malm plan show --proposed

# Accept into Settings, decline (90-day cooldown), or discard
malm proposal accept prop-01 --yes
malm proposal decline prop-02 --yes
malm proposal discard prop-03

# Export your personal edits (redacts #[sensitive] values automatically)
malm export --layer you -o my-baseline.kdl

# Import on another machine as reviewable proposals
malm import my-baseline.kdl --as proposed`
          },
          {
            id: "merge-algebra",
            label: "Editing Maps & Lists",
            filename: "collections.malm",
            lang: "malm",
            note: "Plain `=` always replaces the entire value (never hidden merging). Use `.patch`, `.insert`, `.extend`, `.remove`, `.push`, `#[order(...)]`, and `{ ..base }` when you want to adjust a map or list cleanly.",
            code: `malm 3

const base_win = { quiet: 120, standard: 25 }

#[priority(160)]
layer "herda-collections" {
    // 1. Plain "=" replaces the entire value (number, string, struct, map, or list).
    herda_compositor.layout_cycle = ["stage", "dwindle", "tile", "floating"]

    // 2. Deep-merge specific fields inside a map or struct:
    shell_design.type_scale.patch({
        body: { size: 13, line: 18 },
        title: { size: 20, weight: 600, line: 26 },
    })

    // 3. Add or remove individual map entries without touching the rest:
    herda_compositor.binds.insert("lock", { mods: "SUPER", keysym: "l", command: "lock" })
    herda_compositor.binds.extend({ "find-left": { mods: "SUPER", keysym: "h", command: "focus-left" } })
    herda_compositor.binds.remove("help")
    herda_compositor.binds.remove_all(["quit", "reload"])

    // 4. Add or remove list items with explicit ordering:
    #[order(first)]
    herda_compositor.lock_allow_bindings.push("power")

    #[order(after = "power")]
    herda_compositor.lock_allow_bindings.extend(["volume-raise", "volume-lower"])

    herda_compositor.lock_allow_bindings.push_front("emergency-unlock")
    herda_compositor.lock_allow_bindings.remove("mic-mute")

    // 5. Copy an existing record and change one field:
    pace.window_minutes = { ..base_win, standard: 15 }
}`
          },
          {
            id: "force-and-os",
            label: "#[force] & OS Overlays",
            filename: "/etc/herda/system.malm",
            lang: "malm",
            note: "#[force] runs at priority 1000 so nothing can override it (and locks that option in Settings). In authority os packs, `overlay package` customizes package builds, `system ... overlay` customizes a base OS image, and `export fact` shares read-only system facts with user packs.",
            code: `malm 3
authority os

// Package build overlay with hash-pinned source and patches.
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

// System image overlay built on top of a base system definition.
system live overlay release {
    use kernel("linux-zen");
    hostname = "verksted"
    packages.extend(["ripgrep", "fd"])

    // Share read-only system facts with user packs via os_facts["gpu_vendor"].
    export fact "gpu_vendor" = "amd"
}

// Hard force (priority 1000): overrides every lower tier, including
// ~/.config/malm/ (400), and locks the option in Settings.
layer "workplace-policy" {
    #[force]
    session.require_lock_on_suspend = true
}`
          }
        ]
      },
      {
        type: "grid",
        columns: 2,
        cards: [
          {
            title: "Customize, Reset, and Rewind via CLI",
            tag: "Priority 325 to 375",
            tone: "ok",
            description: "Apply Settings-level changes safely from JSON with `--expected-head`, reset one option back to its inherited value (refuses if locked above `375`), or rewind a single option to an earlier generation.",
            code: `malm plan customize --changes changes.json --expected-head <GEN> --apply --yes\nmalm reset herda_compositor.outer_gap --layer you-profile\nmalm statement at pace.level --generation <GEN>\nmalm statement rewind pace.level --to <GEN> --apply --yes`,
            lang: "sh"
          },
          {
            title: "Forking Modules and CLI Flags",
            tag: "Everyday CLI",
            tone: "accent",
            description: "Copy any module and its templates into `~/.config/malm/` with `malm source fork`, switch profiles with `malm switch`, or pass `--profile`, `--scope`, `--namespace`, and `--target` to `malm plan create` and `malm deploy`.",
            code: `malm source fork notifications -o ~/.config/malm/notifications.malm\nmalm deploy --source /usr/share/herda/smia --profile focus\nmalm switch default --yes\nmalm plan create --namespace work --target home=/srv/home`,
            lang: "sh"
          }
        ]
      },
      {
        type: "callout",
        tone: "changed",
        label: "CLI Tip",
        title: "Where --set Lives in Malm",
        text: "`malm deploy` and `malm plan create` do not take a `--set` or `-D` flag. Use `malm propose --set KEY=VALUE` to queue a quick change for review, `malm plan customize --changes changes.json` to save Settings-level edits, or a file in `~/.config/malm/` for permanent local overrides."
      },
      {
        type: "table",
        caption: "Useful Environment Variables",
        headers: ["Variable", "Default", "What It Controls"],
        rows: [
          ["`MALM_USER_OVERLAY_DIR`", "`$XDG_CONFIG_HOME/malm` or `$HOME/.config/malm`", "Changes where Malm looks for your local `.malm` override files. Set to `\"\"` to disable local overrides."],
          ["`MALM_OS_FACTS_PATH`", "`/run/herda/os-facts.json`", "Points to the read-only system facts file exposed as `os_facts` in user packs (empty map `{}` if absent)."],
          ["`MALM_SOCKET`", "`$XDG_RUNTIME_DIR/malm/malmd.sock`", "Overrides the socket path the CLI uses to talk to the `malmd` background daemon."],
          ["`XDG_CONFIG_HOME`", "`$HOME/.config`", "Base folder for `$XDG_CONFIG_HOME/malm` local overrides (Malm's `customizations/<ns>.json` mirror and `proposed.kdl` stay in `$HOME/.config/malm/`)."],
          ["`XDG_STATE_HOME`", "`$HOME/.local/state`", "Base folder where Malm stores deployed generations and history (`$XDG_STATE_HOME/malm`)."],
          ["`XDG_CACHE_HOME`", "`$HOME/.cache`", "Base folder for Malm's local caches (`$XDG_CACHE_HOME/malm`)."],
          ["`XDG_RUNTIME_DIR`", "Session runtime folder", "Default folder for the `malmd.sock` runtime socket."],
          ["`NO_COLOR` / `FORCE_COLOR` / `TERM`", "Auto-detected", "Controls terminal colors and interactive output (`TERM=dumb` turns off interactive UI)."]
        ]
      },
      {
        type: "table",
        caption: "Quick Guide: Which Override Method Should I Use?",
        headers: ["What You Want to Do", "Best Method", "Priority", "Locks Settings?"],
        rows: [
          ["Tweak a setting and keep it editable in Settings", "Settings UI or `malm plan customize --changes`", "`325` to `375`", "No"],
          ["Keep personal overrides in version-controlled `.malm` files", "`#[priority(400)] layer` or `extend module` in `~/.config/malm/`", "`400`", "Yes (`> 375`)"],
          ["Patch a rendered JSON, TOML, INI, KDL, or text file that has no option", "`overlay json|toml|ini|kdl|text` in `~/.config/malm/`", "`400` (after render)", "No (output file)"],
          ["Rewrite or strip down a module completely", "`malm source fork <mod>` + `override module <mod>` in `~/.config/malm/`", "`400`", "Yes (`> 375`)"],
          ["Let a script, assistant, or teammate suggest an edit safely", "`malm propose --set ... --by ...` + `malm proposal accept`", "`325` to `375` once accepted", "No"],
          ["Change an option for just one project room or app", "`workpiece \"...\"` / `app \"...\"` or `--scope ...`", "`310`, `375`, or `400`", "Only if `> 375`"],
          ["Switch between modes like `default` and `focus`", "`profile \"...\"` + `malm switch <profile>`", "`300`", "No"],
          ["Enforce a rule that nothing else can override", "`#[force]`", "`1000`", "Yes (`> 375`)"],
          ["Customize an OS package build or system image (`authority os`)", "`overlay package` or `system ... overlay`", "OS build", "OS level"]
        ]
      }
    ]
  },

  {
    id: "overrides-precedence",
    group: "overrides",
    badge: "Interactive",
    title: "Priority Order, Conflicts, and Live Simulator",
    subtitle: "How Malm picks winning values from priority 0 to 1000 and catches accidental conflicts",
    lead: "Malm never guesses based on which file was loaded last. Every setting has an exact priority number, two different values at the same priority trigger a clear conflict error, and anything above 375 locks that control in Settings.",
    blocks: [
      {
        type: "table",
        caption: "Complete Malm 3 Priority Order (Lowest to Highest; Custom #[priority(N)] Can Sit Anywhere)",
        headers: ["Priority", "Level", "Where It Comes From", "Locks Settings?"],
        rows: [
          ["`0`", "Option Default", "`option name: Type = value` and struct field defaults", "No"],
          ["`10`", "Soft Default", "`#[default]` layer or assignment", "No"],
          ["`50`", "Cross-Module Write", "Assignments and `impl Slot { ... }` blocks inside another `module`", "No"],
          ["`100`", "Standard Layer", "`layer \"name\" [if cond] { ... }` (including a bare `layer` in `~/.config/malm/`!)", "No"],
          ["`160`", "Visual Look", "`#[priority(160)] layer \"herda-plate\" if selection.look == \"herda\"`", "No"],
          ["`200`", "Machine", "`machine \"<host>\" { ... }` and `machine \"default\" { ... }`", "No"],
          ["`300`", "Profile", "`profile \"<name>\" [if cond] { ... }`", "No"],
          ["`310+`", "Scoped Pack Block", "`workpiece \"<name>\" { ... }` or `app \"<id>\" { ... }` (uses at least `310`, or its enclosing block's priority if higher)", "Only if `> 375`"],
          ["`325` to `350`", "Settings (Machine & Profile)", "Settings UI, `malm plan customize`, and accepted proposals (`machine` at `325`, `profiles` at `350`)", "No"],
          ["`360` to `375`", "Settings (Workpiece & App)", "Per-workpiece and per-app overrides saved from Settings or `malm plan customize`", "No"],
          ["`400`", "Local Override (`~/.config/malm/`)", "`#[priority(400)] layer`, `extend module`, `override module`, and post-render `overlay json|toml|ini|kdl|text`", "Yes (`> 375`)"],
          ["`500`", "Reserved (Future CLI Override)", "Reserved above local files for future command-line overrides", "Yes (`> 375`)"],
          ["`1000`", "Hard Force", "`#[force]` (shorthand for `#[priority(1000)]`)", "Yes (`> 375`)"]
        ]
      },
      {
        type: "grid",
        columns: 2,
        cards: [
          {
            title: "Equal-Priority Conflicts",
            tag: "No Silent Guesswork",
            tone: "danger",
            description: "Higher priorities cleanly override lower ones. If two files set the same option (or insert the same map key) at the exact same priority with different values, Malm stops with a priority conflict error showing both locations. Setting the exact same value twice is fine.",
            code: `error: priority conflict for herda_compositor.binds["my-term"] at priority 400\n  help: pick a distinct #[priority(N)], use #[force], or merge with .patch(...)`,
            lang: "text"
          },
          {
            title: "Stacking Collection Edits & Output Patches",
            tag: "Predictable Merging",
            tone: "ok",
            description: "Unlike `=`, collection methods (`.patch`, `.insert`, `.extend`, `.remove`, `.remove_all`, `.push`) stack across priorities without wiping other entries. Post-render `overlay json|toml|ini|kdl|text` blocks run after a config file is generated, patching the final file cleanly.",
            code: `// 1. Options resolve and render herda-compositor/config.json\n// 2. Post-render overlay json patches the generated file`,
            lang: "malm"
          }
        ]
      },
      {
        type: "simulator"
      },
      {
        type: "code",
        title: "Check What Won from the Terminal",
        filename: "terminal",
        lang: "sh",
        badge: "Malm CLI",
        caption: "Run `malm why` to see every layer that touched an option, which one won, and whether a local file locked it in Settings.",
        code: `# Show every layer that set outer_gap, which one won, and if Settings is locked
malm why herda_compositor.outer_gap

# Trace a workpiece-scoped option for a specific room
malm why pace.level --scope workpiece=Thesis

# Print all resolved options with plain-English descriptions and lock status
malm resolve --all --scope workpiece=Thesis --format json`
      }
    ]
  }
];

window.MalmDocs.precedenceSimulator = {
  title: "Interactive Priority & Override Simulator",
  description: "Toggle layers on and off to watch how Malm 3 picks winning values, locks Settings controls above priority 375, merges keybindings, applies post-render output patches, and catches equal-priority conflicts.",
  scenarios: [
    {
      id: "outer-gap",
      label: "outer_gap & Settings Lock",
      summary: "Follow one spacing option from its module default (0) through the Herda look (160), a Settings profile edit (350), and a ~/.config/malm/ file (400). Turn off the priority-400 file to unlock Settings, or turn on the bare layer (100) to see why leaving off #[priority(400)] makes it lose.",
      scopeInfo: "--profile default",
      keys: [
        {
          key: "herda_compositor.outer_gap",
          label: "herda_compositor.outer_gap",
          description: "Outer screen margin in pixels (0 to 64). Any winning layer above priority 375 locks this slider in Settings."
        }
      ],
      layers: [
        {
          id: "gap-default",
          priority: 0,
          name: "Module Default",
          source: "malm/modules/compositor/herda-compositor.malm:14",
          lang: "malm",
          snippet: `module herda_compositor {\n    option outer_gap: int(0..=64) = 8\n}`,
          explanation: "Starting default defined on the module option (priority 0).",
          defaultEnabled: true,
          ops: [
            {
              key: "herda_compositor.outer_gap",
              op: "set",
              value: 8,
              note: "Module default"
            }
          ]
        },
        {
          id: "gap-bare-trap",
          priority: 100,
          name: "Bare Layer Trap (Missing #[priority(400)])",
          source: "~/.config/malm/oops.malm:3",
          lang: "malm",
          snippet: `malm 3\n// Missing #[priority(400)], so this defaults to priority 100!\nlayer "personal" {\n    herda_compositor.outer_gap = 24\n}`,
          explanation: "Shows the most common pitfall: a standalone layer in ~/.config/malm/ without #[priority(400)] runs at priority 100, so looks (160) and Settings (350) both override it.",
          defaultEnabled: false,
          ops: [
            {
              key: "herda_compositor.outer_gap",
              op: "set",
              value: 24,
              note: "Bare layer defaults to 100 (overridden by 160+)"
            }
          ]
        },
        {
          id: "gap-look",
          priority: 160,
          name: "Herda Look Layer",
          source: "malm/looks/herda/look.malm:77",
          lang: "malm",
          snippet: `#[priority(160)]\nlayer "herda-plate" if selection.look == "herda" {\n    herda_compositor.outer_gap = 6\n}`,
          explanation: "Herda's visual look tightens the outer margin to 6 px (priority 160).",
          defaultEnabled: true,
          ops: [
            {
              key: "herda_compositor.outer_gap",
              op: "set",
              value: 6,
              note: "Herda look 6 px outer margin"
            }
          ]
        },
        {
          id: "gap-settings",
          priority: 350,
          name: "Settings Profile Edit",
          source: "Saved settings (profiles.default)",
          lang: "json",
          snippet: `{\n  "profiles": {\n    "default": {\n      "herda_compositor.outer_gap": { "operation": "set", "value": 10 }\n    }\n  }\n}`,
          explanation: "Personal edit saved in Settings (priority 350). Because 350 is at or below 375, the control stays unlocked in Settings unless a higher layer takes over.",
          defaultEnabled: true,
          ops: [
            {
              key: "herda_compositor.outer_gap",
              op: "set",
              value: 10,
              note: "Settings profile edit (editable)"
            }
          ]
        },
        {
          id: "gap-overlay",
          priority: 400,
          name: "Local Override (#[priority(400)])",
          source: "~/.config/malm/compositor.malm:4",
          lang: "malm",
          snippet: `malm 3\n#[priority(400)]\nlayer "desk" {\n    herda_compositor.outer_gap = 12\n}`,
          explanation: "Local override in ~/.config/malm/ at priority 400. Beats Settings (350) and locks the Settings slider so the UI reflects that your file owns this option.",
          defaultEnabled: true,
          ops: [
            {
              key: "herda_compositor.outer_gap",
              op: "set",
              value: 12,
              note: "Local file wins and locks Settings (> 375)"
            }
          ]
        }
      ]
    },

    {
      id: "pace-scope",
      label: "pace.level, Scopes & Force",
      summary: "Watch a workpiece-scoped option move from its module default (0) through the Focus profile (300), an accepted machine-level proposal (325), a Thesis room override (375), and an optional #[force] rule (1000).",
      scopeInfo: "--profile focus --scope workpiece=Thesis",
      keys: [
        {
          key: "pace.level",
          label: "pace.level",
          description: "How interruptions are delivered (supports per-workpiece overrides)."
        }
      ],
      layers: [
        {
          id: "pace-default",
          priority: 0,
          name: "Module Default",
          source: "malm/modules/pace/pace.malm:36",
          lang: "malm",
          snippet: `module pace {\n    #[scope(workpiece)]\n    option level: PaceLevel = "normal"\n}`,
          explanation: "Starting default defined in pace.malm (priority 0).",
          defaultEnabled: true,
          ops: [
            {
              key: "pace.level",
              op: "set",
              value: "normal",
              note: "Module default"
            }
          ]
        },
        {
          id: "pace-profile",
          priority: 300,
          name: "Focus Profile",
          source: "malm/profiles/focus.malm:5",
          lang: "malm",
          snippet: `profile "focus" {\n    pace.level = "batched"\n}`,
          explanation: "Active profile chosen with --profile focus or malm switch focus (priority 300).",
          defaultEnabled: true,
          ops: [
            {
              key: "pace.level",
              op: "set",
              value: "batched",
              note: "Focus profile value"
            }
          ]
        },
        {
          id: "pace-proposal",
          priority: 325,
          name: "Accepted Proposal (Machine)",
          source: "Saved settings (accepted proposal)",
          lang: "json",
          snippet: `{\n  "machine": {\n    "pace.level": { "operation": "set", "value": "still" }\n  }\n}`,
          explanation: "Saved after running `malm propose --set pace.level=still` and accepting it (machine-level Settings tier at priority 325).",
          defaultEnabled: true,
          ops: [
            {
              key: "pace.level",
              op: "set",
              value: "still",
              note: "Accepted proposal at machine level"
            }
          ]
        },
        {
          id: "pace-workpiece",
          priority: 375,
          name: "Workpiece Override (Thesis)",
          source: "Saved settings (workpieces.Thesis)",
          lang: "json",
          snippet: `{\n  "workpieces": {\n    "Thesis": {\n      "pace.level": { "operation": "set", "value": "quiet" }\n    }\n  }\n}`,
          explanation: "Per-workpiece override active for `--scope workpiece=Thesis` (priority 375). Beats machine-wide Settings (325) while staying editable in Settings.",
          defaultEnabled: true,
          ops: [
            {
              key: "pace.level",
              op: "set",
              value: "quiet",
              note: "Workpiece scope beats machine setting (375 > 325)"
            }
          ]
        },
        {
          id: "pace-force",
          priority: 1000,
          name: "Hard Force (#[force])",
          source: "malm/policy/oncall.malm:4",
          lang: "malm",
          snippet: `layer "oncall-policy" {\n    #[force]\n    pace.level = "normal"\n}`,
          explanation: "A #[force] rule runs at priority 1000. It overrides every lower layer, including workpiece overrides and ~/.config/malm/ files, and locks the option in Settings.",
          defaultEnabled: false,
          ops: [
            {
              key: "pace.level",
              op: "set",
              value: "normal",
              note: "#[force] overrides everything and locks Settings"
            }
          ]
        }
      ]
    },

    {
      id: "binds-overlay",
      label: "Keybindings, Output Patch & Conflict",
      summary: "See how map helpers (.patch, .insert, .remove, .remove_all) combine cleanly across priorities, how a post-render output patch edits the final JSON file, and what happens when two files clash at priority 400.",
      scopeInfo: "--profile default",
      keys: [
        {
          key: "herda_compositor.binds",
          label: "herda_compositor.binds",
          description: "Keybinding map built step by step using explicit map operations."
        },
        {
          key: "output:herda-compositor/config.json",
          label: "output:herda-compositor/config.json",
          description: "Generated JSON file with post-render output patches applied."
        }
      ],
      layers: [
        {
          id: "binds-default",
          priority: 0,
          name: "Module Default",
          source: "malm/modules/compositor/herda-compositor.malm:42",
          lang: "malm",
          snippet: `option binds: Map<string, Keybind> = {\n    close: { mods: "SUPER", keysym: "w", command: "close" },\n    help: { mods: "SUPER", keysym: "F1", command: "show-help" },\n    quit: { mods: "SUPER+Shift", keysym: "q", command: "quit" },\n    reload: { mods: "SUPER+Shift", keysym: "r", command: "reload" },\n}`,
          explanation: "Starting set of keybindings from the compositor module (priority 0).",
          defaultEnabled: true,
          ops: [
            {
              key: "herda_compositor.binds",
              op: "set",
              value: {
                close: "SUPER+w -> close",
                help: "SUPER+F1 -> show-help",
                quit: "SUPER+Shift+q -> quit",
                reload: "SUPER+Shift+r -> reload"
              },
              note: "Base keybinding map"
            }
          ]
        },
        {
          id: "binds-look",
          priority: 160,
          name: "Herda Look Patch & Prune",
          source: "malm/looks/herda/look.malm:142",
          lang: "malm",
          snippet: `#[priority(160)]\nlayer "herda-plate" {\n    herda_compositor.binds.patch({\n        "find-left": { mods: "SUPER", keysym: "h", command: "focus-left" },\n        lock: { mods: "SUPER", keysym: "l", command: "lock" },\n    })\n    herda_compositor.binds.remove_all(["quit", "reload"])\n}`,
          explanation: "Adds Herda's navigation shortcuts and removes quit and reload without wiping out the other bindings.",
          defaultEnabled: true,
          ops: [
            {
              key: "herda_compositor.binds",
              op: "patch",
              value: {
                "find-left": "SUPER+h -> focus-left",
                lock: "SUPER+l -> lock"
              },
              note: "Add Herda shortcuts"
            },
            {
              key: "herda_compositor.binds",
              op: "remove_all",
              value: ["quit", "reload"],
              note: "Remove quit and reload shortcuts"
            }
          ]
        },
        {
          id: "binds-extend",
          priority: 400,
          name: "Local extend module (Priority 400)",
          source: "~/.config/malm/compositor.malm:3",
          lang: "malm",
          snippet: `malm 3\nextend module herda_compositor {\n    herda_compositor.binds.insert("my-term", {\n        mods: "SUPER", keysym: "Return", command: "spawn,kitty",\n    })\n    herda_compositor.binds.remove("help")\n}`,
          explanation: "Local extend module automatically runs at priority 400: adds my-term, removes help, keeps all other shortcuts intact, and locks this map in Settings (> 375).",
          defaultEnabled: true,
          ops: [
            {
              key: "herda_compositor.binds",
              op: "insert",
              mapKey: "my-term",
              value: "SUPER+Return -> spawn,kitty",
              note: "Add custom terminal shortcut"
            },
            {
              key: "herda_compositor.binds",
              op: "remove",
              mapKey: "help",
              value: "help",
              note: "Remove help shortcut"
            }
          ]
        },
        {
          id: "binds-conflict",
          priority: 400,
          name: "Conflicting Local File (Priority Conflict!)",
          source: "~/.config/malm/alt-terminal.malm:4",
          lang: "malm",
          snippet: `malm 3\n#[priority(400)]\nlayer "alt-terminal" {\n    // Same key "my-term" at the same priority 400 with a different value!\n    herda_compositor.binds.insert("my-term", {\n        mods: "SUPER", keysym: "Return", command: "spawn,foot",\n    })\n}`,
          explanation: "Turn this on to see a priority conflict error: two files at priority 400 try to set binds[\"my-term\"] to different commands. Malm stops instead of guessing by filename order.",
          defaultEnabled: false,
          ops: [
            {
              key: "herda_compositor.binds",
              op: "insert",
              mapKey: "my-term",
              value: "SUPER+Return -> spawn,foot",
              note: "Conflicting insert at priority 400"
            }
          ]
        },
        {
          id: "binds-overlay-json",
          priority: 400,
          name: "Post-Render Output Patch (overlay json)",
          source: "~/.config/malm/patch-json.malm:3",
          lang: "malm",
          snippet: `malm 3\noverlay json "herda-compositor/config.json" {\n    custom_flag = true\n    input.patch({ repeat_rate: 45 })\n}`,
          explanation: "Runs after all options are resolved and herda-compositor/config.json is rendered, patching the generated JSON file directly.",
          defaultEnabled: true,
          isOverlayStep55: true,
          ops: [
            {
              key: "output:herda-compositor/config.json",
              op: "overlay_json",
              value: {
                custom_flag: true,
                input: {
                  repeat_rate: 45
                }
              },
              note: "Post-render output patch"
            }
          ]
        }
      ]
    }
  ]
};
