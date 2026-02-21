import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface EditResponsiblePersonModalProps {
  isOpen: boolean
  onClose: () => void
  entity: any
  onSuccess: () => Promise<void>
  makeRequest: (url: string, options?: any) => Promise<any>
}

export function EditResponsiblePersonModal({
  isOpen,
  onClose,
  entity,
  onSuccess,
  makeRequest,
}: EditResponsiblePersonModalProps) {
  const [name, setName] = useState(entity?.responsible_person_name || '')
  const [email, setEmail] = useState(entity?.responsible_person_email || '')
  const [phone, setPhone] = useState(entity?.responsible_person_phone || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!entity?.id) return
    setSaving(true)
    try {
      await makeRequest(`/organizations/entities/${entity.id}/responsible-person`, {
        method: 'PATCH',
        body: JSON.stringify({
          responsible_person_name: name,
          responsible_person_email: email,
          responsible_person_phone: phone,
        }),
      })
      toast.success('Responsible person updated')
      await onSuccess()
      onClose()
    } catch {
      toast.error('Failed to update responsible person')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Responsible Person</DialogTitle>
          <DialogDescription>
            Update the responsible person for {entity?.name || 'this entity'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rp-name">Name</Label>
            <Input id="rp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-email">Email</Label>
            <Input id="rp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-phone">Phone</Label>
            <Input id="rp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
