import React, { useState } from "react";
import { BROKER_CATALOG, validateBrokerFields } from "../../lib/brokers";

export default function BrokerModal({ type, onClose, onConnect }) {
  const spec = BROKER_CATALOG.find((b) => b.type === type);
  const [values, setValues] = useState(() => {
    const init = {};
    spec?.fields.forEach((f) => {
      if (f.type === "select" && f.options?.[0]) init[f.key] = f.options[0];
    });
    return init;
  });
  const [err, setErr] = useState("");

  if (!spec) return null;

  const submit = (e) => {
    e.preventDefault();
    const problem = validateBrokerFields(type, values);
    if (problem) {
      setErr(problem);
      return;
    }
    onConnect({ type, name: spec.name, ...values });
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>Connect {spec.name}</h3>
        <p className="muted">{spec.blurb}</p>
        {spec.fields.length === 0 && (
          <p className="muted">Paper desk is already live on this account.</p>
        )}
        {spec.fields.map((f) => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            {f.type === "select" ? (
              <select
                value={values[f.key] || f.options[0]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              >
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.secret ? "password" : "text"}
                placeholder={f.placeholder}
                value={values[f.key] || ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}
        {err && <div className="error">{err}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={spec.fields.length === 0}>
            Connect
          </button>
        </div>
        <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>
          Keys stay in your browser. This desk routes fills locally so you can rehearse open/close workflow without sending orders to a production venue until you wire a backend proxy.
        </p>
      </form>
    </div>
  );
}
