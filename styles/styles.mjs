const css = (strings, ...values) => String.raw({ raw: strings}, ...values);

export const basicStyle = css`
:host {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #333;
}

h1 {
  text-align: center;
  font-size: 2.5rem;
  color: #fff;
  margin-bottom: 1rem;
  text-shadow: 0 2px 6px rgba(0,0,0,0.2);
}`;
