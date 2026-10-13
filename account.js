/* TrainerDex — configurações de acesso do Mestre e da própria conta do jogador. */
let accountPasswordBusy = false;

function resetPasswordForm(prefix) {
  const form = document.querySelector(`#${prefix}PasswordForm`);
  form.reset();
  form.querySelectorAll('input[autocomplete$="password"]').forEach(input => {
    input.type = 'password';
    input.removeAttribute('aria-invalid');
  });
  document.querySelector(`#${prefix}PasswordError`).textContent = '';
  document.querySelector(`#${prefix}PasswordStatus`).textContent = '';
}

function renderAccountSettings() {
  if (accountPasswordBusy) return;
  resetPasswordForm('master');
  resetPasswordForm('player');
  document.querySelector('#masterSettingsUser').textContent = state.master?.user || 'mestre';
  document.querySelector('#playerAccountName').textContent = me()?.name || '';
  document.querySelector('#playerAccountUser').textContent = me() ? `@${me().username}` : '';
}

function passwordFormError(prefix, message, field) {
  document.querySelector(`#${prefix}PasswordError`).textContent = message;
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }
}

['master', 'player'].forEach(prefix => {
  const form = document.querySelector(`#${prefix}PasswordForm`);
  const current = document.querySelector(`#${prefix}CurrentPassword`);
  const next = document.querySelector(`#${prefix}NewPassword`);
  const confirmation = document.querySelector(`#${prefix}ConfirmPassword`);
  const visibility = document.querySelector(`#${prefix}ShowPassword`);
  const button = document.querySelector(`#${prefix}SavePassword`);
  const status = document.querySelector(`#${prefix}PasswordStatus`);

  visibility.onchange = () => {
    [current, next, confirmation].forEach(input => {
      input.type = visibility.checked ? 'text' : 'password';
    });
  };
  [current, next, confirmation].forEach(input => {
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      document.querySelector(`#${prefix}PasswordError`).textContent = '';
      status.textContent = '';
    });
  });

  form.onsubmit = async event => {
    event.preventDefault();
    if (accountPasswordBusy || session?.role !== prefix) return;
    const account = prefix === 'master' ? state.master : me();
    if (!account) return;
    const password = prefix === 'master' ? account.pass : account.password;
    document.querySelector(`#${prefix}PasswordError`).textContent = '';
    status.textContent = '';
    if (current.value !== password) {
      return passwordFormError(prefix, 'A senha atual está incorreta.', current);
    }
    if (next.value.length < 8 || next.value.length > 128 || !next.value.trim()) {
      return passwordFormError(prefix, 'A nova senha deve ter de 8 a 128 caracteres.', next);
    }
    if (next.value !== confirmation.value) {
      return passwordFormError(prefix, 'A confirmação da nova senha não confere.', confirmation);
    }
    if (next.value === current.value) {
      return passwordFormError(prefix, 'Escolha uma senha diferente da atual.', next);
    }

    accountPasswordBusy = true;
    form.setAttribute('aria-busy', 'true');
    const controls = [...form.querySelectorAll('input, button'),
      ...document.querySelectorAll('#logout, [data-mobile-logout]')];
    controls.forEach(control => { control.disabled = true; });
    button.textContent = 'Salvando…';
    status.textContent = 'Aguarde a confirmação do salvamento.';
    try {
      await changeAccountPassword(prefix, account.id || null, current.value, next.value);
      resetPasswordForm(prefix);
      status.textContent = 'Senha alterada com sucesso. Use a nova senha no próximo acesso.';
      toast('Senha alterada com sucesso.');
    } catch (error) {
      console.error('TrainerDex: não foi possível alterar a senha.', error);
      status.textContent = '';
      passwordFormError(prefix, error.userMessage || 'Não foi possível confirmar a troca de senha. Tente novamente.');
    } finally {
      accountPasswordBusy = false;
      form.removeAttribute('aria-busy');
      controls.forEach(control => { control.disabled = false; });
      button.textContent = 'Salvar nova senha';
    }
  };
});
