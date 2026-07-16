export const generateWhatsAppMessage = (template, context) => {
  if (!template) return "";
  let message = template.messageBody;
  
  if (!message) return "";

  // Replace all {{variable}} with actual values from context
  const variables = template.variables || [];
  
  variables.forEach((variable) => {
    const value = context[variable] || "";
    const regex = new RegExp(`{{${variable}}}`, 'g');
    message = message.replace(regex, value);
  });
  
  // Replace any remaining unmapped variables with empty strings or leave them
  // message = message.replace(/{{.*?}}/g, "");

  return message;
};

export const getWhatsAppUrl = (phone, message) => {
  if (!phone) return null;
  // Clean phone number (remove +, spaces, dashes, etc.)
  let cleanedPhone = String(phone).replace(/\D/g, "");
  
  // Ensure country code (assuming India +91 if not specified and length is 10)
  if (cleanedPhone.length === 10) {
    cleanedPhone = "91" + cleanedPhone;
  }
  
  const encodedMessage = encodeURIComponent(message);
  
  // Check if on mobile or desktop
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    return `whatsapp://send?phone=${cleanedPhone}&text=${encodedMessage}`;
  } else {
    // Desktop can use web.whatsapp or wa.me
    // wa.me usually redirects to the right place
    return `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
  }
};
