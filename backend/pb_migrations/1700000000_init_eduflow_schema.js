/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  // Helper to create collection safely if missing
  const ensureCollection = (data) => {
    try {
      dao.findCollectionByNameOrId(data.name);
    } catch (e) {
      const collection = new Collection(data);
      dao.saveCollection(collection);
    }
  };

  ensureCollection({
    name: "schools",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    schema: [
      { name: "name", type: "text", required: true },
      { name: "code", type: "text", required: true },
      { name: "address", type: "text" },
      { name: "phone", type: "text" },
      { name: "principal_id", type: "text" },
      { name: "principal_email", type: "text" }
    ]
  });

  ensureCollection({
    name: "teachers",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    schema: [
      { name: "user_id", type: "text", required: true },
      { name: "school_id", type: "text" },
      { name: "name", type: "text", required: true },
      { name: "email", type: "text", required: true },
      { name: "phone", type: "text" },
      { name: "assigned_classes", type: "json" }
    ]
  });

  ensureCollection({
    name: "classes",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    schema: [
      { name: "name", type: "text", required: true },
      { name: "grade", type: "text" },
      { name: "section", type: "text" },
      { name: "school_id", type: "text" },
      { name: "teacher_id", type: "text" }
    ]
  });

  ensureCollection({
    name: "students",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    schema: [
      { name: "name", type: "text", required: true },
      { name: "roll_number", type: "text" },
      { name: "gender", type: "text" },
      { name: "class_id", type: "text" },
      { name: "school_id", type: "text" },
      { name: "parent_email", type: "text" }
    ]
  });

  ensureCollection({
    name: "attendance",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    schema: [
      { name: "date", type: "text", required: true },
      { name: "class_id", type: "text", required: true },
      { name: "student_id", type: "text", required: true },
      { name: "status", type: "text", required: true },
      { name: "marked_by", type: "text" }
    ]
  });

  ensureCollection({
    name: "announcements",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    schema: [
      { name: "title", type: "text", required: true },
      { name: "content", type: "text", required: true },
      { name: "target_role", type: "text" },
      { name: "school_id", type: "text" },
      { name: "author", type: "text" },
      { name: "attachment", type: "file" }
    ]
  });
}, (db) => {
  // Rollback
});
