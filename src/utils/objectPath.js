export const getPath = (obj, path) => path.split(".").reduce((value, key) => value?.[key], obj);

export const setPath = (obj, path, value) => {
  const parts = path.split(".");
  const target = parts.slice(0, -1).reduce((acc, key) => {
    acc[key] = acc[key] || {};
    return acc[key];
  }, obj);
  target[parts.at(-1)] = value;
};

export const flattenInitial = (item, fields) => {
  const initial = {};
  fields.forEach((field) => {
    let value = getPath(item, field.name);
    if (value === undefined && item.user && typeof item.user === "object") {
      value = item.user[field.name];
    }
    if (field.type === "select" && value?._id) initial[field.name] = value._id;
    else if (field.type === "multiselect" && Array.isArray(value)) initial[field.name] = value.map((entry) => entry._id || entry);
    else if (field.type === "date" && value) initial[field.name] = String(value).slice(0, 10);
    else initial[field.name] = value ?? "";
  });
  return initial;
};

export const buildPayload = (values, fields) => {
  const payload = {};
  fields.forEach((field) => {
    const value = values[field.name];
    if (field.type === "file") return;
    if (value === "" || value === undefined) return;
    if (field.type === "day-checkboxes") {
      setPath(payload, field.name, Array.isArray(value) ? value.join(", ") : value);
    } else {
      setPath(payload, field.name, field.type === "number" ? Number(value) : value);
    }
  });
  return payload;
};
