import { Numbers } from "../domain/Numbers.js";
import { SvgError } from "../domain/SvgError.js";
import { ShapeFactory } from "../application/ShapeFactory.js";
import type { EditorApplication } from "../application/EditorApplication.js";
import { CreateCommand } from "../application/commands/CreateCommand.js";
import { DeleteCommand } from "../application/commands/DeleteCommand.js";
import { MoveCommand } from "../application/commands/MoveCommand.js";
import { ScaleCommand } from "../application/commands/ScaleCommand.js";
import { SetCommand } from "../application/commands/SetCommand.js";
import { GroupCommand } from "../application/commands/GroupCommand.js";
import { UngroupCommand } from "../application/commands/UngroupCommand.js";
import { AddToCommand } from "../application/commands/AddToCommand.js";
import { FrontCommand } from "../application/commands/FrontCommand.js";
import { BackCommand } from "../application/commands/BackCommand.js";
import { CommandLexer } from "./CommandLexer.js";
import { DocumentPresenter } from "./DocumentPresenter.js";
import type { Token } from "./Token.js";

export class CommandDispatcher {
  readonly #lexer = new CommandLexer();
  readonly #presenter = new DocumentPresenter();
  readonly #handlers: ReadonlyMap<string, (args: readonly Token[]) => string[] | Promise<string[]>>;
  static readonly #help = [
    "init [w h]", "read <file.svg>", "save [file.svg]", "canvas [w h]",
    "create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]",
    "create circle <id> <cx> <cy> <r> [fill] [in <containerId>]",
    "create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]",
    "create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]",
    'create text <id> <x> <y> "content" [in <containerId>]',
    "create g <id> [in <containerId>]", "delete <id>", "move <id> <dx> <dy>",
    "scale <id> <factor>", "set <id> <attr> <value>", "group <newGid> <id1> <id2>…",
    "ungroup <gid>", "addto <gid> <id>", "front <id>", "back <id>",
    "tree [id]", "show <id>", "help", "undo", "redo",
    "# starts a comment line; Ctrl-D exits",
  ];

  public constructor(private readonly editor: EditorApplication, private readonly factory = new ShapeFactory()) {
    this.#handlers = new Map<string, (args: readonly Token[]) => string[] | Promise<string[]>>([
      ["init", args => { this.dimensionArgs(args, "init"); return editor.init(...this.dimensions(args)); }],
      ["read", args => { this.arity(args, 1, 1, "read <file.svg>"); return editor.read(args[0]!.value); }],
      ["save", args => { this.arity(args, 0, 1, "save [file.svg]"); return editor.save(args[0]?.value); }],
      ["canvas", args => { this.dimensionArgs(args, "canvas"); return editor.canvas(...this.dimensions(args)); }],
      ["create", args => this.create(args)],
      ["delete", args => { this.arity(args, 1, 1, "delete <id>"); return editor.execute(new DeleteCommand(args[0]!.value)); }],
      ["move", args => { this.arity(args, 3, 3, "move <id> <dx> <dy>"); return editor.execute(new MoveCommand(args[0]!.value, this.numeric(args, 1, "dx"), this.numeric(args, 2, "dy"))); }],
      ["scale", args => { this.arity(args, 2, 2, "scale <id> <factor>"); return editor.execute(new ScaleCommand(args[0]!.value, this.numeric(args, 1, "scale factor"))); }],
      ["set", args => { this.arity(args, 3, 3, "set <id> <attr> <value>"); return editor.execute(new SetCommand(args[0]!.value, args[1]!.value, args[2]!.value)); }],
      ["group", args => { this.arity(args, 2, Infinity, "group <newGid> <id1> <id2>…"); return editor.execute(new GroupCommand(args[0]!.value, args.slice(1).map(token => token.value))); }],
      ["ungroup", args => { this.arity(args, 1, 1, "ungroup <gid>"); return editor.execute(new UngroupCommand(args[0]!.value)); }],
      ["addto", args => { this.arity(args, 2, 2, "addto <gid> <id>"); return editor.execute(new AddToCommand(args[0]!.value, args[1]!.value)); }],
      ["front", args => { this.arity(args, 1, 1, "front <id>"); return editor.execute(new FrontCommand(args[0]!.value)); }],
      ["back", args => { this.arity(args, 1, 1, "back <id>"); return editor.execute(new BackCommand(args[0]!.value)); }],
      ["tree", args => { this.arity(args, 0, 1, "tree [id]"); return this.#presenter.tree(editor.document, args[0]?.value); }],
      ["show", args => { this.arity(args, 1, 1, "show <id>"); return this.#presenter.show(editor.document, args[0]!.value); }],
      ["help", args => { this.arity(args, 0, 0, "help"); return [...CommandDispatcher.#help]; }],
      ["undo", args => { this.arity(args, 0, 0, "undo"); return editor.undo(); }],
      ["redo", args => { this.arity(args, 0, 0, "redo"); return editor.redo(); }],
    ]);
  }

  public async execute(line: string): Promise<string[]> {
    try {
      const tokens = this.#lexer.tokenize(line);
      if (!tokens.length) return [];
      const handler = this.#handlers.get(tokens[0]!.value);
      if (!handler) throw new SvgError(`unknown command: ${tokens[0]!.value}`);
      return await handler(tokens.slice(1));
    } catch (error) {
      return [`error: ${(error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, " ")}`];
    }
  }

  private create(args: readonly Token[]): string[] {
    this.arity(args, 2, Infinity, "create <type> <id> [params…] [in <containerId>]");
    let parameters = args.slice(2); let containerId: string | undefined;
    const suffix = parameters.at(-2);
    if (suffix?.value === "in" && !suffix.quoted) {
      containerId = parameters.at(-1)!.value; parameters = parameters.slice(0, -2);
    }
    return this.editor.execute(new CreateCommand(this.factory, args[0]!.value, args[1]!.value, parameters.map(token => token.value), containerId));
  }
  private arity(args: readonly Token[], minimum: number, maximum: number, syntax: string): void {
    if (args.length < minimum || args.length > maximum) throw new SvgError(`usage: ${syntax}`);
  }
  private dimensionArgs(args: readonly Token[], command: string): void {
    if (args.length !== 0 && args.length !== 2) throw new SvgError(`usage: ${command} [w h]`);
  }
  private dimensions(args: readonly Token[]): [] | [number, number] {
    return args.length ? [this.numeric(args, 0, "width"), this.numeric(args, 1, "height")] : [];
  }
  private numeric(args: readonly Token[], index: number, name: string): number { return Numbers.parse(args[index]!.value, name); }
}
