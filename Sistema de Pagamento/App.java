public class App {
    public static void main(String[] args) throws Exception {
        // Cria o "cérebro" do sistema, que vai gerenciar tudo
        SistemaFinanceiro sistema = new SistemaFinanceiro();

        // Cria dois clientes
        Assinante joao = new Assinante("João Silva", "joao@email.com");
        Assinante maria = new Assinante("Maria Souza", "maria@email.com");
        Assinante lucas = new Assinante("Lucas", "lucas@email.com");
        Assinante Izaele = new Assinante("Izaele", "izaele@email.com");

        // Pede pro sistema cadastrar a assinatura de cada um, já ligando ao plano escolhido
        Assinatura assinaturaJoao = sistema.cadastrarAssinante(joao, Plano.BASICO);
        Assinatura assinaturaMaria = sistema.cadastrarAssinante(maria, Plano.PREMIUM);
        Assinatura assinaturaLucas = sistema.cadastrarAssinante(lucas, Plano.PADRAO);
        Assinatura assinaturaIzaele = sistema.cadastrarAssinante(Izaele, Plano.PREMIUM);

        // Simula o pagamento de cada um (status PAGO)
        sistema.processarPagamento(assinaturaJoao, StatusPagamento.PAGO);
        sistema.processarPagamento(assinaturaMaria, StatusPagamento.PAGO);
        sistema.processarPagamento(assinaturaLucas, StatusPagamento.PAGO);
        sistema.processarPagamento(assinaturaIzaele, StatusPagamento.PAGO);

        // João decide fazer upgrade de plano
        sistema.alterarPlano(assinaturaJoao, Plano.PADRAO);

        // Mostra quanto o sistema arrecadou no total
        System.out.println("\nReceita total: R$" + sistema.calcularReceitaTotal());

        // Lista quem ainda está com assinatura ativa
        System.out.println("\nAssinaturas ativas:");
        for (Assinatura a : sistema.listarAssinaturasAtivas()) {
            System.out.println(a);
        }
    }
}