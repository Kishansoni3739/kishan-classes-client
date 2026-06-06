export const defaultSubjects = ["Maths", "Science", "English", "Physics", "Chemistry", "Biology", "History", "Geography"];

export function seedData() {
  const currentYear = new Date().getFullYear();
  const settings = {
    coachingName: "Kishan Classes",
    address: "Gautam Nagar, Agra",
    phone: "+91 9389915375",
    logo: "",
    feeDueDay: 5,
    subjects: defaultSubjects,
    gradeBoundaries: { aPlus: 90, a: 80, b: 70, c: 55, d: 40 },
    academicYear: `${currentYear}-${currentYear + 1}`,
  };

  return {
    settings,
    batches: [],
    students: [],
    feeRecords: [],
    tests: [],
    scheduledTests: [],
    notificationLogs: [],
    messageTemplates: [],
  };
}
