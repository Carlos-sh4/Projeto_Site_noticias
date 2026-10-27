public enum Plano {
    BASICO("Básico", 18.90, 1),
    PADRAO("Padrão", 39.90, 2),
    PREMIUM("Premium", 55.90, 4);

    private final String nome;
    private final double valorMensal;
    private final int telasSimultaneas;

    Plano(String nome, double valorMensal, int telasSimultaneas) {
        this.nome = nome;
        this.valorMensal = valorMensal;
        this.telasSimultaneas = telasSimultaneas;
    }

    public String getNome() {
        return nome;
    }

    public double getValorMensal() {
        return valorMensal;
    }

    public int getTelasSimultaneas() {
        return telasSimultaneas;
    }
}