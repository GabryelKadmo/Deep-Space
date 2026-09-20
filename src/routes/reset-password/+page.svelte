<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Alert } from '$lib/components/ui/alert';

  let { data } = $props();

  // svelte-ignore state_referenced_locally
  const { form, errors, message, enhance, delayed } = superForm(data.form);
</script>

<svelte:head>
  <title>Reset Password</title>
</svelte:head>

<div class="flex items-center justify-center min-h-screen">
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle>Reset Password</CardTitle>
      <CardDescription>Enter your new password below</CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      {#if $message}
        <Alert variant="destructive">
          <span class="text-sm">{$message}</span>
        </Alert>
      {/if}

      <form method="POST" use:enhance class="space-y-4">
        <input type="hidden" name="token" value={$form.token} />
        <input type="hidden" name="email" value={$form.email} />

        <div class="space-y-2">
          <Label for="password">New Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            bind:value={$form.password}
            aria-invalid={$errors.password ? 'true' : undefined}
            disabled={$delayed}
          />
          {#if $errors.password}
            <p class="text-sm text-destructive">{$errors.password[0]}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="password_confirmation">Confirm Password</Label>
          <Input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            placeholder="Repeat your password"
            bind:value={$form.password_confirmation}
            aria-invalid={$errors.password_confirmation ? 'true' : undefined}
            disabled={$delayed}
          />
          {#if $errors.password_confirmation}
            <p class="text-sm text-destructive">{$errors.password_confirmation[0]}</p>
          {/if}
        </div>

        <Button type="submit" class="w-full" disabled={$delayed}>
          {$delayed ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </CardContent>
  </Card>
</div>
