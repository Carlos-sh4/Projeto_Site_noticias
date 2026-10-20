import java.time.LocalDate;

public class Pagamento {
    private double valor;
    private LocalDate data;
    private StatusPagamento status;

    public Pagamento(double valor, LocalDate data, StatusPagamento status) {
        this.valor = valor;
        this.data = data;
        this.status = status;
    }

    public double getValor() {
        return valor;
    }

    public LocalDate getData() {
        return data;
    }

    public StatusPagamento getStatus() {
        return status;
    }

    public void setStatus(StatusPagamento status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return "Pagamento{valor=R$" + valor + ", data=" + data + ", status=" + status + "}";
    }
}