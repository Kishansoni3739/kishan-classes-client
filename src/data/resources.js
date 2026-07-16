export const resources = {

  students: {
    title: "Students",
    endpoint: "/students",
    roles: ["admin", "teacher"],
    createRoles: ["admin"],
    bulkDelete: true,
    columns: [
      ["studentId", "Student ID"],
      ["user.name", "Name"],
      ["batch.name", "Batch"],
      ["admissionDate", "Admission Date"],
      ["monthlyFee", "Monthly Fee"],
      ["status", "Status"]
    ],
    filters: [
      { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Suspended", value: "suspended" }] },
      { key: "batch", label: "Batch", type: "api", endpoint: "/batches", labelKey: "name", valueKey: "_id" }
    ],
    fields: [
      { name: "name", label: "Student Name", required: true, section: "Personal Details", minLength: 2, maxLength: 100 },
      { name: "phone", label: "Mobile Number", section: "Personal Details", pattern: "^\\d{10}$", errorMessage: "Valid mobile number is required." },
      { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true, section: "Personal Details", max: "today" },
      { name: "gender", label: "Gender", type: "select-static", options: ["male", "female", "other"], required: true, section: "Personal Details" },
      { name: "guardian.name", label: "Guardian Name", required: true, section: "Personal Details" },
      { name: "guardian.phone", label: "Guardian Phone", required: true, section: "Personal Details", pattern: "^\\d{10}$", errorMessage: "Valid mobile number is required." },
      { name: "guardian.relation", label: "Relation", section: "Personal Details" },
      { name: "email", label: "Email (Optional)", type: "email", section: "Personal Details" },
      { name: "address", label: "Address", type: "textarea", section: "Personal Details" },

      { name: "admissionDate", label: "Admission Date", type: "date", required: true, section: "Admission Details", max: "today" },
      { name: "status", label: "Status", type: "select-static", options: ["active", "inactive", "suspended"], required: true, section: "Admission Details" },
      { name: "batch", label: "Batch", type: "select", source: "/batches", required: true, section: "Admission Details" },
      { name: "monthlyFee", label: "Monthly Fee", type: "number", required: true, section: "Admission Details", min: 1 },
      { name: "openingBalance", label: "Opening Dues Balance (Optional)", type: "number", section: "Admission Details", min: 0, defaultValue: 0 },
      { name: "subjects", label: "Subjects", type: "multiselect", source: "/subjects", section: "Admission Details" }
    ]
  },

  teachers: {
    title: "Teachers",
    endpoint: "/teachers",
    roles: ["admin"],
    createRoles: ["admin"],
    bulkDelete: true,
    columns: [
      ["employeeId", "Employee ID"],
      ["user.name", "Name"],
      ["qualification", "Qualification"],
      ["experienceYears", "Experience"],
      ["batches", "Batches"]
    ],
    fields: [
      { name: "name", label: "Teacher Name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone" },
      { name: "employeeId", label: "Employee ID", required: true },
      { name: "qualification", label: "Qualification" },
      { name: "experienceYears", label: "Experience Years", type: "number" },
      { name: "subjects", label: "Subjects", type: "multiselect", source: "/subjects" },
      { name: "batches", label: "Batches", type: "multiselect", source: "/batches" },
      { name: "salary", label: "Salary", type: "number" },
      { name: "address", label: "Address", type: "textarea" }
    ]
  },

  subjects: {
    title: "Subjects",
    endpoint: "/subjects",
    roles: ["admin"],
    createRoles: ["admin"],
    bulkDelete: true,
    columns: [["name", "Subject"], ["code", "Code"]],
    fields: [
      { name: "name", label: "Subject Name", required: true },
      { name: "code", label: "Code", required: true },
      { name: "description", label: "Description", type: "textarea" }
    ]
  },
  batches: {
    title: "Batches",
    endpoint: "/batches",
    roles: ["admin", "teacher"],
    createRoles: ["admin"],
    bulkDelete: true,
    columns: [["name", "Batch"], ["schedule", "Schedule"], ["students", "Students"]],
    fields: [
      { name: "name", label: "Batch Name", required: true },

      { name: "subjects", label: "Subjects", type: "multiselect", source: "/subjects" },
      { name: "teachers", label: "Teachers", type: "multiselect", source: "/teachers", optionLabel: "user.name" },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "schedule", label: "Schedule", type: "day-checkboxes" },
      { name: "room", label: "Room" },
      { name: "capacity", label: "Capacity", type: "number" }
    ]
  },
  "monthly-fees": {
    title: "Monthly Fees",
    endpoint: "/monthly-fees",
    roles: ["admin", "student"],
    createRoles: [],
    columns: [
      ["student.user.name", "Student"],
      ["enrollment.batch.name", "Batch"],
      ["periodStart", "Period Start"],
      ["periodEnd", "Period End"],
      ["dueDate", "Due Date"],
      ["totalAmount", "Total"],
      ["status", "Status"]
    ],
    filters: [
      { key: "status", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Partial", value: "partial" }, { label: "Pending", value: "pending" }, { label: "Overdue", value: "overdue" }] }
    ],
    fields: [],
    action: "collectMonthlyFee"
  },
  "monthly-fees/reversals": {
    title: "Payment Reversals",
    endpoint: "/monthly-fees/reversals",
    roles: ["admin"],
    createRoles: [],
    columns: [
      ["studentName", "Student"],
      ["amount", "Amount"],
      ["reason", "Reason"],
      ["reversedBy", "Reversed By"],
      ["date", "Date"]
    ],
    fields: []
  },

  tests: {
    title: "Tests",
    endpoint: "/tests",
    roles: ["admin", "teacher", "student"],
    createRoles: ["admin", "teacher"],
    bulkDelete: true,
    columns: [["title", "Test Name"], ["subject.name", "Subject"], ["batch.name", "Batch"], ["students", "Students"], ["testDate", "Date"], ["maxMarks", "Marks"]],
    fields: [
      { name: "title", label: "Test Name", required: true },
      { name: "subject", label: "Subject", type: "select", source: "/subjects", required: true },
      { name: "batch", label: "Batch", type: "select", source: "/batches" },
      { name: "students", label: "Students", type: "multiselect-search", source: "/students", optionLabel: "user.name", filterOptions: (options, values) => values.batch ? options.filter((o) => o.batch?._id === values.batch || o.batch === values.batch) : options },
      { name: "teacher", label: "Teacher", type: "select", source: "/teachers", optionLabel: "user.name", required: true },
      { name: "testDate", label: "Test Date", type: "date", required: true, min: "today" },
      { name: "maxMarks", label: "Max Marks", type: "number", required: true },
      { name: "description", label: "Description", type: "textarea" }
    ],
    action: "enterMarks"
  },
  results: {
    title: "Results",
    endpoint: "/results",
    roles: ["admin", "teacher", "student"],
    createRoles: ["admin", "teacher"],
    bulkDelete: true,
    columns: [["student.user.name", "Student"], ["test.title", "Test"], ["test.testDate", "Date"], ["marksObtained", "Marks"], ["percentage", "Percentage"], ["grade", "Grade"]],
    fields: [
      { name: "test", label: "Test", type: "select", source: "/tests", optionLabel: "title", required: true },
      { name: "student", label: "Student", type: "select", source: "/students", optionLabel: "user.name", required: true },
      { name: "marksObtained", label: "Marks Obtained", type: "number", required: true },
      { name: "remarks", label: "Remarks", type: "textarea" }
    ]
  },
  "study-materials": {
    title: "Study Materials",
    endpoint: "/study-materials",
    roles: ["admin", "teacher", "student"],
    createRoles: ["admin", "teacher"],
    bulkDelete: true,
    columns: [["title", "Title"], ["subject.name", "Subject"], ["audience", "Audience"], ["fileName", "File"], ["uploadedBy.name", "Uploaded By"]],
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "subject", label: "Subject", type: "select", source: "/subjects" },
      { 
        name: "audience", 
        label: "Send To", 
        type: "select-static", 
        options: [
          { label: "All Teachers & Students", value: "all" },
          { label: "All Students", value: "students" },
          { label: "All Teachers", value: "teachers" },
          { label: "Batch Students", value: "batch" },
          { label: "Particular Student", value: "student" },
          { label: "Particular Teacher", value: "teacher" }
        ] 
      },
      { 
        name: "batch", 
        label: "Batch", 
        type: "select", 
        source: "/batches",
        dependsOn: (values) => values.audience === "batch"
      },
      {
        name: "students",
        label: "Students",
        type: "multiselect",
        source: "/students",
        optionLabel: "user.name",
        dependsOn: (values) => values.audience === "student"
      },
      {
        name: "teachers",
        label: "Teachers",
        type: "multiselect",
        source: "/teachers",
        optionLabel: "user.name",
        dependsOn: (values) => values.audience === "teacher"
      },
      { name: "file", label: "PDF / Notes", type: "file" },
      { name: "fileUrl", label: "External File URL" },
      { name: "fileName", label: "File Name", dependsOn: (values) => values._id },
      { name: "notifyThroughWhatsApp", label: "Notify through WhatsApp", type: "checkbox" }
    ],
    multipart: true
  },
  notices: {
    title: "Notices",
    endpoint: "/notices",
    roles: ["admin", "teacher", "student"],
    createRoles: ["admin"],
    bulkDelete: true,
    columns: [["title", "Title"], ["audience", "Audience"], ["priority", "Priority"], ["createdAt", "Created"]],
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "message", label: "Message", type: "textarea", required: true },
      { 
        name: "audience", 
        label: "Audience", 
        type: "select-static", 
        options: [
          { label: "All Teachers & Students", value: "all" },
          { label: "All Students", value: "students" },
          { label: "All Teachers", value: "teachers" },
          { label: "Batch Students", value: "batch" },
          { label: "Particular Student", value: "student" },
          { label: "Particular Teacher", value: "teacher" }
        ] 
      },
      { 
        name: "batch", 
        label: "Batch", 
        type: "select", 
        source: "/batches",
        dependsOn: (values) => values.audience === "batch"
      },
      {
        name: "students",
        label: "Students",
        type: "multiselect",
        source: "/students",
        optionLabel: "user.name",
        dependsOn: (values) => values.audience === "student"
      },
      {
        name: "teachers",
        label: "Teachers",
        type: "multiselect",
        source: "/teachers",
        optionLabel: "user.name",
        dependsOn: (values) => values.audience === "teacher"
      },
      { name: "priority", label: "Priority", type: "select-static", options: ["low", "normal", "high"] },
      { name: "expiresAt", label: "Expires At", type: "date" },
      { name: "notifyThroughWhatsApp", label: "Notify through WhatsApp", type: "checkbox" }
    ]
  },
  settings: {
    title: "Settings",
    endpoint: "/settings",
    roles: ["admin"],
    createRoles: ["admin"],
    columns: [["key", "Key"], ["value", "Value"], ["updatedAt", "Updated"]],
    fields: [
      { name: "key", label: "Setting Key (e.g., STUDENT_ID_PREFIX)", required: true },
      { name: "value", label: "Setting Value", required: true }
    ]
  }
};
