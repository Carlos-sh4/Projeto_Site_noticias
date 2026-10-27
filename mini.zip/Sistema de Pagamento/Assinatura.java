import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

public class Assinatura {
    private Assinante assinante;
    private Plano plano;
    private LocalDate dataInicio;
    private StatusAssinatura status;
    private List<Pagamento> historicoPagamentos;

    public Assinatura(Assinante assinante, Plano plano, LocalDate dataInicio) {
        this.assinante = assinante;
        this.plano = plano;
        this.dataInicio = dataInicio;
        this.status = StatusAssinatura.ATIVA;
        this.historicoPagamentos = new ArrayList<>();
    }

    public void adicionarPagamento(Pagamento pagamento) {
        historicoPagamentos.add(pagamento);
    }

    public void alterarPlano(Plano novoPlano) {
        this.plano = novoPlano;
    }

    public void suspender() {
        this.status = StatusAssinatura.SUSPENSA;
    }

    public void reativar() {
        this.status = StatusAssinatura.ATIVA;
    }

    public void cancelar() {
        this.status = StatusAssinatura.CANCELADA;
    }

    public boolean possuiAtrasoSuperiorA(int dias) {
        return historicoPagamentos.stream()
                .filter(p -> p.getStatus() == StatusPagamento.ATRASADO)
                .anyMatch(p -> ChronoUnit.DAYS.between(p.getData(), LocalDate.now()) > dias);
    }

    public Assinante getAssinante() {
        return assinante;
    }

    public Plano getPlano() {
        return plano;
    }

    public LocalDate getDataInicio() {
        return dataInicio;
    }

    public StatusAssinatura getStatus() {
        return status;
    }

    public List<Pagamento> getHistoricoPagamentos() {
        return historicoPagamentos;
    }

    @Override
    public String toString() {
        return assinante.getNome() + " - Plano " + plano.getNome() + " - Status: " + status;
    }
}