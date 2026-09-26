import { useState } from "react";
import { normaliseTag } from "../lib/format";
import styles from "./TagPicker.module.scss";

// Multi-select of the user's existing tags, plus a box to create new ones.
// New tags are added to the options and selected straight away; they are
// only saved (and created server-side) when the bookmark is submitted.
//
// value: selected tag names; onChange(names); options: existing tag names.
export default function TagPicker({ id = "tags", value, onChange, options }) {
  const [newTag, setNewTag] = useState("");
  const [created, setCreated] = useState([]);

  const allOptions = [...new Set([...options, ...created, ...value])].sort();

  function handleSelect(e) {
    onChange([...e.target.selectedOptions].map((o) => o.value));
  }

  function addNewTag() {
    const name = normaliseTag(newTag);
    if (!name) return;
    if (!allOptions.includes(name)) setCreated((c) => [...c, name]);
    if (!value.includes(name)) onChange([...value, name]);
    setNewTag("");
  }

  function handleNewTagKey(e) {
    // Enter adds the tag rather than submitting the whole form.
    if (e.key === "Enter") {
      e.preventDefault();
      addNewTag();
    }
  }

  return (
    <div className={styles.picker}>
      <select
        id={id}
        multiple
        value={value}
        onChange={handleSelect}
        size={Math.min(8, Math.max(3, allOptions.length))}
        aria-describedby={`${id}-help`}
      >
        {allOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <p id={`${id}-help`} className={styles.help}>
        {allOptions.length === 0
          ? "You have no tags yet — create one below."
          : "Hold Ctrl (Cmd on a Mac) to select more than one."}
      </p>

      <div className={styles.newTag}>
        <label htmlFor={`${id}-new`} className="visually-hidden">
          New tag
        </label>
        <input
          id={`${id}-new`}
          type="text"
          placeholder="New tag"
          value={newTag}
          maxLength={50}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleNewTagKey}
        />
        <button type="button" className="button-quiet" onClick={addNewTag}>
          Add tag
        </button>
      </div>

      {value.length > 0 && (
        <p className={styles.selected} aria-live="polite">
          Selected: {value.join(", ")}
        </p>
      )}
    </div>
  );
}
