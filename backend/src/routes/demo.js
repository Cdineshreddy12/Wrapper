import { authenticateToken } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { contactSubmissions } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export default async function demoRoutes(fastify, options) {
  // Schedule a demo
  fastify.post('/schedule', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'company', 'jobTitle'],
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          company: { type: 'string', minLength: 1 },
          phone: { type: 'string' },
          jobTitle: { type: 'string', minLength: 1 },
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

      console.log('🎯 Demo Request Received:', {
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
        source: 'demo',
        ip: request.ip || null,
        userAgent: request.headers['user-agent'] || null,
      })

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500))

      // In production, you would also:
      // 1. Send confirmation email to user
      // 2. Send notification email to sales team
      // 3. Integrate with CRM (HubSpot, Salesforce, etc.)
      // 4. Schedule calendar event

      reply.send({
        success: true,
        message: 'Demo scheduled successfully! Our team will contact you within 24 hours.',
        data: {
          scheduled: true,
          estimatedContact: '24 hours'
        }
      })

    } catch (error) {
      console.error('Demo scheduling error:', error)
      reply.code(500).send({
        success: false,
        message: 'Failed to schedule demo. Please try again.'
      })
    }
  })

  // Get demo statistics (admin only)
  fastify.get('/stats', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      // Query database for demo stats
      const totalDemos = await db.select().from(contactSubmissions).where(eq(contactSubmissions.source, 'demo'));
      
      reply.send({
        success: true,
        data: {
          totalDemos: totalDemos.length,
          pendingDemos: totalDemos.length, // All demos are pending by default
          completedDemos: 0,
          conversionRate: 0
        }
      })
    } catch (error) {
      console.error('Demo stats error:', error)
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch demo statistics'
      })
    }
  })
}
