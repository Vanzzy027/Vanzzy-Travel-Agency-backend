import nodemailer from "nodemailer";
export const sendNotificationEmail = async (email, full_name, subject, message) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_SENDER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
        const mailOptions = {
            from: `"Vans Tours & Travel" <${process.env.EMAIL_SENDER}>`,
            to: email,
            subject: subject,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .header {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .logo {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .tagline {
            font-size: 1.1rem;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 1.5rem;
            color: #2d3748;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .message {
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 30px;
            font-size: 1rem;
        }
        
        .highlight {
            background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%);
            padding: 15px;
            border-radius: 12px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
        }
        
        .btn-primary {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .feature-item {
            text-align: center;
            padding: 15px;
            background: #f7fafc;
            border-radius: 12px;
            transition: all 0.3s ease;
        }
        
        .feature-item:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .footer {
            background: #2d3748;
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-link {
            display: inline-block;
            margin: 0 10px;
            color: white;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 20px;
            background: rgba(255,255,255,0.1);
            transition: all 0.3s ease;
        }
        
        .social-link:hover {
            background: rgba(255,255,255,0.2);
            transform: scale(1.05);
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
            margin: 30px 0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">🚗 Vans Tours & Travel</div>
            <div class="tagline">Your Journey Begins Here</div>
        </div>
        
        <!-- Content -->
        <div class="content">
            <h1 class="greeting">Hello, ${full_name}! 🌴</h1>
            
            <div class="message">
                ${message}
            </div>
            
            <div class="highlight">
                <strong>🌟 Travel Tip:</strong> Book 60 days in advance for the best deals on international flights!
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://Vans Tours & Travel.com/dashboard" class="btn-primary">
                    Explore Your Dashboard 🚀
                </a>
            </div>
            
            <div class="features">
                <div class="feature-item">
                    <div class="feature-icon">🏝️</div>
                    <div>Beach Getaways</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">🏔️</div>
                    <div>Mountain Adventures</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">🏛️</div>
                    <div>Cultural Tours</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">🎯</div>
                    <div>Custom Packages</div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="social-links">
                <a href="#" class="social-link">📘 Facebook</a>
                <a href="#" class="social-link">📷 Instagram</a>
                <a href="#" class="social-link">🐦 Twitter</a>
                <a href="#" class="social-link">💼 LinkedIn</a>
            </div>
            
            <div class="contact-info">
                <p>📍 019 Amrit, Travel City, CH027 10101</p>
                <p>📞 +254 112 175-578</p>
                <p>✉️ hello@Vans Tours & Travel.com</p>
            </div>
            
            <div class="divider"></div>
            
            <p style="opacity: 0.7; font-size: 0.8rem;">
                &copy; 2025 Vans Tours & Travel. All rights reserved.<br>
                <span style="font-size: 0.7rem;">Making your travel dreams come true since 2025</span>
            </p>
        </div>
    </div>
</body>
</html>
      `,
        };
        const mailRes = await transporter.sendMail(mailOptions);
        if (mailRes.accepted.length > 0) {
            return "Notification email sent successfully";
        }
        else if (mailRes.rejected.length > 0) {
            return "Notification email not sent, please try again";
        }
        else {
            return "Email server error";
        }
    }
    catch (error) {
        console.error("Email error:", error);
        return "Email server error";
    }
};
// Enhanced OTP Email Function
export async function sendOtpEmail(email, full_name, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_SENDER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
        const mailOptions = {
            from: `"Vans Tours & Travel Security" <${process.env.EMAIL_SENDER}>`,
            to: email,
            subject: "Your OTP Code - Vans Tours & Travel",
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        
        .email-container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        
        .logo { font-size: 2rem; font-weight: 700; }
        
        .content { padding: 40px 30px; text-align: center; }
        
        .otp-code {
            font-size: 3rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 20px 0;
            letter-spacing: 10px;
        }
        
        .warning {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            color: #c53030;
        }
        
        .footer {
            background: #2d3748;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 0.8rem;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🔒 Vans Tours & Travel</div>
        </div>
        
        <div class="content">
            <h2>Security Verification</h2>
            <p>Hello ${full_name},</p>
            <p>Use this OTP to verify your identity:</p>
            
            <div class="otp-code">${otp}</div>
            
            <div class="warning">
                <strong>⚠️ This code expires in 15 minutes</strong><br>
                Do not share this code with anyone.
            </div>
            
            <p>If you didn't request this, please ignore this email.</p>
        </div>
        
        <div class="footer">
            &copy; 2025 Vans Tours & Travel Security Team
        </div>
    </div>
</body>
</html>
      `,
        };
        await transporter.sendMail(mailOptions);
        return true;
    }
    catch (error) {
        console.error("OTP email error:", error);
        return false;
    }
}
