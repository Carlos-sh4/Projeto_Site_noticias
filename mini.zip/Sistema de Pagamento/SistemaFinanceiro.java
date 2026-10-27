import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class SistemaFinanceiro {
    private final List<Assinatura> assinaturas;

    public SistemaFinanceiro() {
        this.assinaturas = new ArrayList<>();
    }

    public Assinatura cadastrarAssinante(Assinante assinante, Plano plano) {
        Assinatura assinatura = new Assinatura(assinante, plano, LocalDate.now());
        assinaturas.add(assinatura);
        System.out.println("Assinatura criada: " + assinatura);
        return assinatura;
    }

    public void processarPagamento(Assinatura assinatura, StatusPagamento status) {
        Pagamento pagamento = new Pagamento(assinatura.getPlano().getValorMensal(), LocalDate.now(), status);
        assinatura.adicionarPagamento(pagamento);

        if (status == StatusPagamento.ATRASADO && assinatura.possuiAtrasoSuperiorA(10)) {
            assinatura.suspender();
            System.out.println("Assinatura de " + assinatura.getAssinante().getNome() + " suspensa por atraso.");
        }
    }

    public void alterarPlano(Assinatura assinatura, Plano novoPlano) {
        Plano antigo = assinatura.getPlano();
        assinatura.alterarPlano(novoPlano);
        String tipo = novoPlano.getValorMensal() > antigo.getValorMensal() ? "Upgrade" : "Downgrade";
        System.out.println(tipo + " realizado: " + antigo.getNome() + " -> " + novoPlano.getNome());
    }

    public double calcularReceitaTotal() {
        return assinaturas.stream()
                .flatMap(a -> a.getHistoricoPagamentos().stream())
                .filter(p -> p.getStatus() == StatusPagamento.PAGO)
                .mapToDouble(Pagamento::getValor)
                .sum();
    }

    public List<Assinatura> listarAssinaturasAtivas() {
        List<Assinatura> ativas = new ArrayList<>();
        for (Assinatura a : assinaturas) {
            if (a.getStatus() == StatusAssinatura.ATIVA) {
                ativas.add(a);
            }
        }
        return ativas;
    }

    public List<Assinatura> getAssinaturas() {
        return assinaturas;
    }
}