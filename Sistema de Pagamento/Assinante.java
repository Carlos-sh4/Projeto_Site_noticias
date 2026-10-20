public class Assinante {
    private String nome;
    private String email;
    private String cpf;

    public Assinante(String nome, String email) {
        this.nome = nome;
        this.email = email;
        this.cpf = cpf;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getCpf() {
        return cpf;
    }

    @Override
    public String toString() {
        return nome + " (" + email + ")";
    }
}