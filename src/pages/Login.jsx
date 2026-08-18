import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { usuariosApi } from '../api';

export default function Login() {
  const [tab,    setTab]    = useState('login'); // 'login' | 'solicitar' | 'esqueci'
  const [email,  setEmail]  = useState('');
  const [senha,  setSenha]  = useState('');
  const [erro,   setErro]   = useState('');
  const [ok,     setOk]     = useState('');
  const [busy,   setBusy]   = useState(false);

  // Formulário de solicitação
  const [solic, setSolic] = useState({
    nome: '', sobrenome: '', email: '', matricula: '',
    senha: '', senha2: '', setor: '', cargo: '',
  });

  async function handleLogin(e) {
    e.preventDefault();
    setErro(''); setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      // AuthContext cuida do redirecionamento via onAuthStateChanged
    } catch (err) {
      setErro('E-mail ou senha incorretos.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSolicitar(e) {
    e.preventDefault();
    setErro(''); setOk(''); setBusy(true);
    try {
      if (solic.senha !== solic.senha2) throw new Error('Senhas não coincidem.');
      if (!solic.setor) throw new Error('Selecione o setor.');
      await usuariosApi.enviarSolicitacao(solic);
      setOk('Solicitação enviada! Aguarde aprovação de um administrador.');
      setSolic({ nome:'', sobrenome:'', email:'', matricula:'', senha:'', senha2:'', setor:'', cargo:'' });
    } catch (err) {
      setErro(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEsqueci(e) {
    e.preventDefault();
    setErro(''); setOk(''); setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setOk('E-mail de redefinição enviado!');
    } catch {
      setErro('E-mail não encontrado.');
    } finally {
      setBusy(false);
    }
  }

  const setores = ['MG1','MG2','MG3','MG4','Cenografia','Arte'];
  const cargos  = ['Aux. Almoxarifado','Almoxarife','Encarregado','Supervisor','Coordenador','Gerente','Gerente Geral','Solicitante/Responsável'];

  return (
    <div className="login-wrap">
      {/* ── Login ── */}
      {tab === 'login' && (
        <div className="login-card">
          <div className="login-logo">MRO</div>
          <div className="login-titulo">Entrar no sistema</div>
          {erro && <div className="alert alert-error">{erro}</div>}
          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="login-field">
              <label>Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          <div className="login-links">
            <button onClick={() => setTab('esqueci')}>Esqueci minha senha</button>
            <button onClick={() => setTab('solicitar')}>Solicitar acesso</button>
          </div>
        </div>
      )}

      {/* ── Esqueci senha ── */}
      {tab === 'esqueci' && (
        <div className="login-card">
          <button className="btn-back" onClick={() => setTab('login')}>← Voltar</button>
          <div className="login-titulo">Redefinir senha</div>
          {erro && <div className="alert alert-error">{erro}</div>}
          {ok  && <div className="alert alert-ok">{ok}</div>}
          <form onSubmit={handleEsqueci}>
            <div className="login-field">
              <label>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar link de redefinição'}
            </button>
          </form>
        </div>
      )}

      {/* ── Solicitar acesso ── */}
      {tab === 'solicitar' && (
        <div className="login-card">
          <button className="btn-back" onClick={() => setTab('login')}>← Voltar</button>
          <div className="login-titulo">Solicitar acesso</div>
          {erro && <div className="alert alert-error">{erro}</div>}
          {ok  && <div className="alert alert-ok">{ok}</div>}
          {!ok && (
            <form onSubmit={handleSolicitar}>
              <div className="field-row">
                <div className="login-field">
                  <label>Nome</label>
                  <input value={solic.nome} onChange={e => setSolic(p=>({...p,nome:e.target.value}))} required />
                </div>
                <div className="login-field">
                  <label>Sobrenome</label>
                  <input value={solic.sobrenome} onChange={e => setSolic(p=>({...p,sobrenome:e.target.value}))} required />
                </div>
              </div>
              <div className="login-field">
                <label>E-mail</label>
                <input type="email" value={solic.email} onChange={e => setSolic(p=>({...p,email:e.target.value}))} required />
              </div>
              <div className="login-field">
                <label>Matrícula</label>
                <input value={solic.matricula} onChange={e => setSolic(p=>({...p,matricula:e.target.value}))} required />
              </div>
              <div className="login-field">
                <label>Senha</label>
                <input type="password" value={solic.senha} onChange={e => setSolic(p=>({...p,senha:e.target.value}))} required />
              </div>
              <div className="login-field">
                <label>Confirmar senha</label>
                <input type="password" value={solic.senha2} onChange={e => setSolic(p=>({...p,senha2:e.target.value}))} required />
              </div>

              {/* Setor obrigatório */}
              <div className="login-field">
                <label>Setor <span className="obrigatorio">*obrigatório</span></label>
                <div className="btn-grid-3">
                  {setores.map(s => (
                    <button key={s} type="button"
                      className={`btn-setor ${solic.setor===s?'ativo':''}`}
                      onClick={() => setSolic(p=>({...p,setor:s}))}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cargo opcional */}
              <div className="login-field">
                <label>Cargo <span className="opcional">opcional</span></label>
                <div className="btn-grid-2">
                  {cargos.map(c => (
                    <button key={c} type="button"
                      className={`btn-setor ${solic.cargo===c?'ativo':''}`}
                      onClick={() => setSolic(p=>({...p,cargo:p.cargo===c?'':c}))}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar solicitação'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
