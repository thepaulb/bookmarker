import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagPicker from "./TagPicker";

// Controlled wrapper so selections round-trip like they do in the form.
function Harness({ options, initial = [], onChange = () => {} }) {
  const [value, setValue] = useState(initial);
  return (
    <TagPicker
      value={value}
      options={options}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

function select() {
  return screen.getByRole("listbox");
}

describe("TagPicker", () => {
  it("lists existing tags alphabetically in a multi-select", () => {
    render(<Harness options={["ux", "agile", "fitness"]} />);

    expect(select()).toHaveAttribute("multiple");
    expect(
      screen.getAllByRole("option").map((o) => o.textContent),
    ).toEqual(["agile", "fitness", "ux"]);
  });

  it("allows selecting several tags", async () => {
    const onChange = vi.fn();
    render(<Harness options={["agile", "ux"]} onChange={onChange} />);

    await userEvent.selectOptions(select(), ["agile", "ux"]);

    expect(onChange).toHaveBeenLastCalledWith(["agile", "ux"]);
    expect(screen.getByText("Selected: agile, ux")).toBeInTheDocument();
  });

  it("creates a new tag with the button, normalised and selected", async () => {
    const onChange = vi.fn();
    render(<Harness options={["ux"]} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("New tag"), "  Brand  New ");
    await userEvent.click(screen.getByRole("button", { name: "Add tag" }));

    expect(onChange).toHaveBeenLastCalledWith(["brand new"]);
    expect(screen.getByRole("option", { name: "brand new" }).selected).toBe(true);
    expect(screen.getByLabelText("New tag")).toHaveValue("");
  });

  it("creates a new tag on Enter without submitting the form", async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Harness options={[]} />
      </form>,
    );

    await userEvent.type(screen.getByLabelText("New tag"), "fresh{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("option", { name: "fresh" })).toBeInTheDocument();
  });

  it("selects an existing tag rather than duplicating it", async () => {
    render(<Harness options={["ux"]} />);

    await userEvent.type(screen.getByLabelText("New tag"), "UX{Enter}");

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: "ux" }).selected).toBe(true);
  });

  it("ignores blank new tags", async () => {
    const onChange = vi.fn();
    render(<Harness options={["ux"]} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("New tag"), "   {Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not add a tag twice to the selection", async () => {
    const onChange = vi.fn();
    render(<Harness options={[]} initial={["ux"]} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("New tag"), "ux{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("prompts to create a tag when the user has none", () => {
    render(<Harness options={[]} />);
    expect(
      screen.getByText("You have no tags yet — create one below."),
    ).toBeInTheDocument();
  });
});
