// In-memory job storage (in production, use Redis or a database)
const importJobs = new Map();

class ImportJob {
  constructor(jobId, totalRows) {
    this.jobId = jobId;
    this.status = 'processing'; // processing, completed, failed
    this.totalRows = totalRows;
    this.processedRows = 0;
    this.importedRows = 0;
    this.failedRows = 0;
    this.errors = [];
    this.startTime = Date.now();
    this.endTime = null;
    this.progress = 0;
  }

  updateProgress(processed, imported, failed, errors = []) {
    this.processedRows = processed;
    this.importedRows = imported;
    this.failedRows = failed;
    this.errors = [...this.errors, ...errors];
    this.progress = Math.round((processed / this.totalRows) * 100);
  }

  complete() {
    this.status = 'completed';
    this.endTime = Date.now();
    this.progress = 100;
  }

  fail(error) {
    this.status = 'failed';
    this.endTime = Date.now();
    this.errors.push(error);
  }

  getStatus() {
    return {
      jobId: this.jobId,
      status: this.status,
      progress: this.progress,
      totalRows: this.totalRows,
      processedRows: this.processedRows,
      importedRows: this.importedRows,
      failedRows: this.failedRows,
      errors: this.errors.slice(0, 100), // Limit errors to first 100
      duration: this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime
    };
  }
}

module.exports = {
  importJobs,
  ImportJob
};
