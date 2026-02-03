import { db } from '../db/index.js';
import { contactSubmissions } from '../db/schema/index.js';

export default async function contactRoutes(fastify, options) {
  // Submit contact form
  fastify.post('/submit', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'company'],
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          company: { type: 'string', minLength: 1 },
          phone: { type: 'string' },
          jobTitle: { type: 'string' },
          companySize: { type: 'string' },
          preferredTime: { type: 'string' },
          comments: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const {
        name,
        email,
        company,
        phone,
        jobTitle,
        companySize,
        preferredTime,
        comments
      } = request.body

      console.log('📧 Contact Form Submission Received:', {
        name,
        email,
        company,
        phone,
        jobTitle,
        companySize,
        preferredTime,
        comments,
        timestamp: new Date().toISOString(),
        ip: request.ip,
        userAgent: request.headers['user-agent']
      })

      // Save to database
      await db.insert(contactSubmissions).values({
        name,
        email,
        company: company || null,
        phone: phone || null,
        jobTitle: jobTitle || null,
        companySize: companySize || null,
        preferredTime: preferredTime || null,
        comments: comments || null,
        source: 'contact',
        ip: request.ip || null,
        userAgent: request.headers['user-agent'] || null,
      })

      reply.send({
        success: true,
        message: 'Thank you for contacting us! We will get back to you soon.',
        data: {
          submitted: true
        }
      })

    } catch (error) {
      console.error('Contact form submission error:', error)
      reply.code(500).send({
        success: false,
        message: 'Failed to submit contact form. Please try again.'
      })
    }
  })
}
