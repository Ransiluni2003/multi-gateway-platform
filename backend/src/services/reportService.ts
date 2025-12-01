// src/services/reportService.ts
export const generateReport = async (data: any) => {
  // Simulate report generation logic
  console.log("Generating report for:", data);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { success: true };
};
