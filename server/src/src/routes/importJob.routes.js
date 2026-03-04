const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { importJobs } = require('../services/importJob.service');

router.use(authMiddleware);

// Get job status
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = importJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job not found'
    });
  }

  res.json({
    success: true,
    data: job.getStatus()
  });
});

// Get all jobs (optional, for debugging)
router.get('/jobs', (req, res) => {
  const jobs = Array.from(importJobs.values()).map(job => job.getStatus());
  res.json({
    success: true,
    data: jobs
  });
});

module.exports = router;
