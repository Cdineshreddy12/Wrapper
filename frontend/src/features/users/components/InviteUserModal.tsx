import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Checkbox,
  Form,
  FormField,
  ScrollArea,
  Textarea,
  FormControl,
  FormDescription,
  FormItem,
  FormMessage,
  FormLabel,
  Button,
} from "../ui";
import { InputField } from "../rhf-fields/InputField";
import { Role } from "@/types/user-management";
import { Section } from "@/components/common/Page/Section";

const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  roleIds: z.array(z.string()).optional(),
  message: z.string().optional(),
});

export type InviteFormData = z.infer<typeof inviteUserSchema>;

export interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    roles: Role[];
    onInvite: (data: any) => void;
}

export const InviteUserModal = ({ isOpen, onClose, roles, onInvite }: InviteUserModalProps) => { 

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      name: "",
      roleIds: [],
      message: "",
    },
  });

  const handleClose = () => {
    onClose();
  };

  const onSubmit = (data: InviteFormData) => {
    console.log(data);
    onInvite(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md overflow-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to a new user to join your organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form  className="space-y-6">
            <Section
              title="User Information"
              description="Basic details for the new user"
              size="sm"
              variant="filled"
            >
              <div className="space-y-4">
                <InputField
                  name="email"
                  control={form.control}
                  label="Email"
                  placeholder="Enter email"
                  required
                />
                <InputField
                  name="name"
                  control={form.control}
                  label="Name"
                  placeholder="Enter name"
                  required
                />
              </div>
            </Section>

            <Section
              title="Role Assignment"
              description="Select roles to assign to the new user"
              size="sm"
              variant="filled"
            >
              <FormField
                control={form.control}
                name="roleIds"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ScrollArea className="h-auto w-full rounded-md border p-2">
                        <div className="space-y-2">
                          {roles.map((role) => (
                            <div
                              key={role.roleId}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`role-${role.roleId}`}
                                checked={
                                  field.value?.includes(role.roleId) ?? false
                                }
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value ?? [];
                                  if (checked) {
                                    field.onChange([
                                      ...currentValue,
                                      role.roleId,
                                    ]);
                                  } else {
                                    field.onChange(
                                      currentValue.filter(
                                        (id: string) => id !== role.roleId
                                      )
                                    );
                                  }
                                }}
                              />
                              <FormLabel
                                htmlFor={`role-${role.roleId}`}
                                className="flex items-center gap-2 cursor-pointer font-normal"
                              >
                                <span style={{ color: role.color }}>
                                  {role.icon}
                                </span>
                                <span className="text-sm">{role.roleName}</span>
                              </FormLabel>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Section>

            <Section
              title="Personal Message"
              description="Add a personal message to include in the invitation"
              size="sm"
              variant="filled"
            >
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Welcome to our team! We're excited to have you join us."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Section>
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>Send Invitation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default InviteUserModal;
