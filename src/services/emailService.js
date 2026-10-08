// src/services/emailService.js
import emailjs from '@emailjs/browser';

class EmailService {
  constructor() {
    // Initialize with your EmailJS credentials
    emailjs.init('YOUR_PUBLIC_KEY');
  }

  async sendApprovalEmail(to, data) {
    const templateParams = {
      to_email: to.email,
      to_name: to.name,
      document_title: data.documentTitle,
      document_type: data.documentType,
      approval_link: `https://your-app.com/approval/pending`,
      action_required: data.actionRequired || false,
      due_date: data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'ASAP'
    };

    try {
      await emailjs.send(
        'YOUR_SERVICE_ID',
        'YOUR_TEMPLATE_ID',
        templateParams
      );
    } catch (error) {
    }
  }

  async sendApprovalReminder(to, data) {
    const templateParams = {
      to_email: to.email,
      to_name: to.name,
      document_title: data.documentTitle,
      days_overdue: data.daysOverdue || 0,
      approval_link: `https://your-app.com/approval/pending`,
      urgent: data.urgent || false
    };

    try {
      await emailjs.send(
        'YOUR_SERVICE_ID',
        'YOUR_REMINDER_TEMPLATE_ID',
        templateParams
      );
    } catch (error) {
    }
  }

  async sendApprovalResult(to, data) {
    const templateParams = {
      to_email: to.email,
      to_name: to.name,
      document_title: data.documentTitle,
      status: data.status,
      comments: data.comments || '',
      next_steps: data.nextSteps || '',
      reviewer_name: data.reviewerName || 'Approval System'
    };

    try {
      await emailjs.send(
        'YOUR_SERVICE_ID',
        'YOUR_RESULT_TEMPLATE_ID',
        templateParams
      );
    } catch (error) {
    }
  }
}

export default new EmailService();